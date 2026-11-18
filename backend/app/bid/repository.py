"""
Bid Repository — database operations for bids.
"""
from sqlalchemy.orm import Session
from app.models import Bid
from app.utils import to_naive_utc
from app.bid.schemas import BidCreate
from datetime import datetime


def create(db: Session, rfq_id: int, data: BidCreate, total_price: float, submitted_at: datetime) -> Bid:
    bid = Bid(
        rfq_id=rfq_id,
        carrier_name=data.carrier_name,
        freight_charges=data.freight_charges,
        origin_charges=data.origin_charges,
        destination_charges=data.destination_charges,
        total_price=total_price,
        transit_time=data.transit_time,
        validity_of_quote=to_naive_utc(data.validity_of_quote),
        submitted_at=submitted_at,
    )
    db.add(bid)
    return bid
