"""
Bid Service — orchestrates quote submission with British Auction extension rules.
Calls the auction engine for rule evaluation, then persists via repositories.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models import RFQ, ActivityLog
from app.utils import now_utc, to_naive_utc
from app.rfq import repository as rfq_repo
from app.bid import repository as bid_repo
from app.bid.schemas import BidCreate, BidSubmitResponse
from app.auction.engine import (
    get_auction_status,
    should_extend_auction,
    assign_ranks_to_bids,
)


def submit_bid(
    db: Session,
    rfq_id: int,
    data: BidCreate,
    simulated_time: Optional[datetime] = None,
) -> BidSubmitResponse:
    rfq = rfq_repo.get_by_id(db, rfq_id)
    if not rfq:
        raise ValueError("RFQ not found")

    current_time = to_naive_utc(simulated_time) if simulated_time else now_utc()

    # Guard: only accept bids on active auctions
    status = get_auction_status(rfq, current_time)
    if status != "Active":
        raise ValueError(f"Cannot submit bid: Auction is '{status}'.")

    total_price = round(data.freight_charges + data.origin_charges + data.destination_charges, 2)

    # Evaluate British Auction extension *before* saving the new bid
    will_extend, extension_reason = should_extend_auction(
        rfq, rfq.bids, data.carrier_name, total_price, current_time
    )

    # Persist the bid
    new_bid = bid_repo.create(db, rfq.id, data, total_price, current_time)

    # Persist submission log
    db.add(ActivityLog(
        rfq_id=rfq.id,
        event_type="BID_SUBMISSION",
        carrier_name=data.carrier_name,
        bid_amount=total_price,
        reason=f"Quote submitted by {data.carrier_name} for ${total_price:,.2f}",
        created_at=current_time,
    ))

    # Apply extension if triggered
    if will_extend:
        _apply_extension(db, rfq, data.carrier_name, total_price, extension_reason, current_time)

    db.commit()
    db.refresh(rfq)

    # Determine rank of the newly submitted bid
    ranked_bids = assign_ranks_to_bids(rfq.bids)
    match = next((b for b in ranked_bids if b["id"] == new_bid.id), None)

    return BidSubmitResponse(
        id=new_bid.id,
        rfq_id=new_bid.rfq_id,
        carrier_name=new_bid.carrier_name,
        freight_charges=new_bid.freight_charges,
        origin_charges=new_bid.origin_charges,
        destination_charges=new_bid.destination_charges,
        total_price=new_bid.total_price,
        transit_time=new_bid.transit_time,
        validity_of_quote=new_bid.validity_of_quote,
        submitted_at=new_bid.submitted_at,
        rank=match["rank"] if match else "N/A",
    )


def _apply_extension(db: Session, rfq: RFQ, carrier_name: str, bid_amount: float, reason: str, current_time: datetime) -> None:
    """Extends the auction close time, capped strictly at forced_bid_close_time."""
    from datetime import timedelta

    old_close = to_naive_utc(rfq.current_bid_close_time)
    forced_close = to_naive_utc(rfq.forced_bid_close_time)
    tentative = old_close + timedelta(minutes=rfq.extension_duration_minutes)

    capped = tentative > forced_close
    new_close = forced_close if capped else tentative

    if new_close <= old_close:
        return  # Already at the ceiling, nothing to extend

    rfq.current_bid_close_time = new_close
    cap_note = " (Capped at Forced Close Time)" if capped else ""

    db.add(ActivityLog(
        rfq_id=rfq.id,
        event_type="TIME_EXTENSION",
        carrier_name=carrier_name,
        bid_amount=bid_amount,
        previous_close_time=old_close,
        new_close_time=new_close,
        reason=f"{reason} Extended by {rfq.extension_duration_minutes}m{cap_note}.",
        created_at=current_time,
    ))
