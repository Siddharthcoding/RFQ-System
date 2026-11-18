from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    pickup_service_date = Column(DateTime, nullable=False)
    is_british_auction = Column(Boolean, default=True, nullable=False)

    bid_start_time = Column(DateTime, nullable=False)
    initial_bid_close_time = Column(DateTime, nullable=False)
    current_bid_close_time = Column(DateTime, nullable=False)
    forced_bid_close_time = Column(DateTime, nullable=False)

    trigger_window_minutes = Column(Integer, default=10, nullable=False)  # X
    extension_duration_minutes = Column(Integer, default=5, nullable=False)  # Y
    extension_trigger_type = Column(
        String(50), default="ANY_BID", nullable=False
    )  # ANY_BID, ANY_RANK_CHANGE, L1_RANK_CHANGE

    created_at = Column(DateTime, default=utcnow, nullable=False)

    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan", order_by="Bid.total_price")
    activity_logs = relationship(
        "ActivityLog",
        back_populates="rfq",
        cascade="all, delete-orphan",
        order_by="ActivityLog.created_at.desc()"
    )


class Bid(Base):
    __tablename__ = "bids"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    carrier_name = Column(String(100), nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, nullable=False)
    destination_charges = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    transit_time = Column(String(50), nullable=False)
    validity_of_quote = Column(DateTime, nullable=False)
    submitted_at = Column(DateTime, default=utcnow, nullable=False)

    rfq = relationship("RFQ", back_populates="bids")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # BID_SUBMITTED, TIME_EXTENDED, RFQ_CREATED
    carrier_name = Column(String(100), nullable=True)
    bid_amount = Column(Float, nullable=True)
    previous_close_time = Column(DateTime, nullable=True)
    new_close_time = Column(DateTime, nullable=True)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    rfq = relationship("RFQ", back_populates="activity_logs")
