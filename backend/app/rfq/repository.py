"""
RFQ Repository — all database queries for RFQs and their activity logs.
No business logic here. Just reads and writes.
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import RFQ, ActivityLog
from app.utils import to_naive_utc
from app.rfq.schemas import RFQCreate


def get_all(db: Session) -> List[RFQ]:
    return db.query(RFQ).order_by(RFQ.created_at.desc()).all()


def get_by_id(db: Session, rfq_id: int) -> Optional[RFQ]:
    return db.query(RFQ).filter(RFQ.id == rfq_id).first()


def get_by_number(db: Session, rfq_number: str) -> Optional[RFQ]:
    return db.query(RFQ).filter(RFQ.rfq_number == rfq_number).first()


def count_all(db: Session) -> int:
    return db.query(RFQ).count()


def create(db: Session, data: RFQCreate) -> RFQ:
    rfq = RFQ(
        rfq_number=data.rfq_number,
        title=data.title,
        pickup_service_date=to_naive_utc(data.pickup_service_date),
        is_british_auction=data.is_british_auction,
        bid_start_time=to_naive_utc(data.bid_start_time),
        initial_bid_close_time=to_naive_utc(data.bid_close_time),
        current_bid_close_time=to_naive_utc(data.bid_close_time),
        forced_bid_close_time=to_naive_utc(data.forced_bid_close_time),
        trigger_window_minutes=data.trigger_window_minutes,
        extension_duration_minutes=data.extension_duration_minutes,
        extension_trigger_type=data.extension_trigger_type,
    )
    db.add(rfq)
    db.flush()  # flush so rfq.id is available before commit
    return rfq


def get_activity_logs(db: Session, rfq_id: int) -> List[ActivityLog]:
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.rfq_id == rfq_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )


def add_activity_log(db: Session, log: ActivityLog) -> None:
    db.add(log)
