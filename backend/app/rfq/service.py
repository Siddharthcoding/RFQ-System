"""
RFQ Service — business logic for creating and reading RFQs.
Knows about domain rules (auction status, trigger windows), not about HTTP.
"""
from datetime import timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import RFQ, ActivityLog
from app.utils import now_utc, to_naive_utc
from app.rfq import repository as rfq_repo
from app.rfq.schemas import RFQCreate, RFQListItem, RFQDetailResponse, BidResponse, ActivityLogResponse
from app.auction.engine import get_auction_status, is_in_trigger_window, assign_ranks_to_bids


def _time_remaining(rfq: RFQ, current_time) -> float:
    close = to_naive_utc(rfq.current_bid_close_time)
    return max(0.0, (close - current_time).total_seconds())


def list_rfqs(db: Session) -> List[RFQListItem]:
    rfqs = rfq_repo.get_all(db)
    current_time = now_utc()
    result = []

    for rfq in rfqs:
        status = get_auction_status(rfq, current_time)
        in_window = is_in_trigger_window(rfq, current_time)

        lowest_bid = None
        lowest_carrier = None
        if rfq.bids:
            sorted_bids = sorted(rfq.bids, key=lambda b: b.total_price)
            lowest_bid = sorted_bids[0].total_price
            lowest_carrier = sorted_bids[0].carrier_name

        result.append(RFQListItem(
            id=rfq.id,
            rfq_number=rfq.rfq_number,
            title=rfq.title,
            is_british_auction=rfq.is_british_auction,
            pickup_service_date=rfq.pickup_service_date,
            bid_start_time=rfq.bid_start_time,
            current_bid_close_time=rfq.current_bid_close_time,
            forced_bid_close_time=rfq.forced_bid_close_time,
            current_lowest_bid=lowest_bid,
            lowest_bidder_carrier=lowest_carrier,
            total_bids_count=len(rfq.bids),
            status=status,
            is_in_trigger_window=in_window,
            time_remaining_seconds=_time_remaining(rfq, current_time),
        ))

    return result


def create_rfq(db: Session, data: RFQCreate) -> RFQDetailResponse:
    # Duplicate check
    if rfq_repo.get_by_number(db, data.rfq_number):
        raise ValueError(f"RFQ number '{data.rfq_number}' already exists.")

    rfq = rfq_repo.create(db, data)

    log = ActivityLog(
        rfq_id=rfq.id,
        event_type="RFQ_CREATED",
        reason=(
            f"RFQ '{rfq.rfq_number}' created. British Auction: "
            f"Trigger Window={rfq.trigger_window_minutes}m, "
            f"Extension={rfq.extension_duration_minutes}m, "
            f"Mode={rfq.extension_trigger_type}."
        ),
    )
    rfq_repo.add_activity_log(db, log)
    db.commit()
    db.refresh(rfq)

    current_time = now_utc()
    return RFQDetailResponse(
        id=rfq.id,
        rfq_number=rfq.rfq_number,
        title=rfq.title,
        is_british_auction=rfq.is_british_auction,
        pickup_service_date=rfq.pickup_service_date,
        bid_start_time=rfq.bid_start_time,
        initial_bid_close_time=rfq.initial_bid_close_time,
        current_bid_close_time=rfq.current_bid_close_time,
        forced_bid_close_time=rfq.forced_bid_close_time,
        trigger_window_minutes=rfq.trigger_window_minutes,
        extension_duration_minutes=rfq.extension_duration_minutes,
        extension_trigger_type=rfq.extension_trigger_type,
        status=get_auction_status(rfq, current_time),
        is_in_trigger_window=is_in_trigger_window(rfq, current_time),
        time_remaining_seconds=_time_remaining(rfq, current_time),
        bids=[],
        activity_logs=[ActivityLogResponse.model_validate(log)],
    )


def get_rfq_detail(db: Session, rfq_id: int) -> RFQDetailResponse:
    rfq = rfq_repo.get_by_id(db, rfq_id)
    if not rfq:
        raise ValueError("RFQ not found")

    current_time = now_utc()
    ranked_bids = assign_ranks_to_bids(rfq.bids)

    return RFQDetailResponse(
        id=rfq.id,
        rfq_number=rfq.rfq_number,
        title=rfq.title,
        is_british_auction=rfq.is_british_auction,
        pickup_service_date=rfq.pickup_service_date,
        bid_start_time=rfq.bid_start_time,
        initial_bid_close_time=rfq.initial_bid_close_time,
        current_bid_close_time=rfq.current_bid_close_time,
        forced_bid_close_time=rfq.forced_bid_close_time,
        trigger_window_minutes=rfq.trigger_window_minutes,
        extension_duration_minutes=rfq.extension_duration_minutes,
        extension_trigger_type=rfq.extension_trigger_type,
        status=get_auction_status(rfq, current_time),
        current_lowest_bid=ranked_bids[0]["total_price"] if ranked_bids else None,
        lowest_bidder_carrier=ranked_bids[0]["carrier_name"] if ranked_bids else None,
        is_in_trigger_window=is_in_trigger_window(rfq, current_time),
        time_remaining_seconds=_time_remaining(rfq, current_time),
        bids=[BidResponse(**b) for b in ranked_bids],
        activity_logs=[
            ActivityLogResponse.model_validate(l)
            for l in rfq_repo.get_activity_logs(db, rfq_id)
        ],
    )
