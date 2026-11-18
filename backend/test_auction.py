"""
Unit tests for British Auction business rules.
Tests target the auction engine directly — no HTTP, no real DB needed.
Uses an in-memory SQLite database (acceptable for tests even though prod uses PostgreSQL).
"""
from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import RFQ, Bid, ActivityLog
from app.rfq.schemas import RFQCreate
from app.bid.schemas import BidCreate
from app.bid.service import submit_bid
from app.auction.engine import (
    get_auction_status,
    is_in_trigger_window,
    compute_supplier_rankings,
    should_extend_auction,
)
from app.utils import now_utc


# ── Test DB fixture ───────────────────────────────────────────────────────────

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_rfq(db, trigger_type="ANY_BID", window=10, ext_duration=5, close_in_min=5, forced_in_min=20):
    now = now_utc()
    rfq = RFQ(
        rfq_number=f"TEST-{datetime.now().microsecond}",
        title="Test RFQ",
        pickup_service_date=now + timedelta(days=5),
        is_british_auction=True,
        bid_start_time=now - timedelta(hours=1),
        initial_bid_close_time=now + timedelta(minutes=close_in_min),
        current_bid_close_time=now + timedelta(minutes=close_in_min),
        forced_bid_close_time=now + timedelta(minutes=forced_in_min),
        trigger_window_minutes=window,
        extension_duration_minutes=ext_duration,
        extension_trigger_type=trigger_type,
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq, now


def make_bid_payload(**kwargs):
    defaults = dict(
        carrier_name="Test Carrier",
        freight_charges=500.0,
        origin_charges=50.0,
        destination_charges=50.0,
        transit_time="2 Days",
        validity_of_quote=now_utc() + timedelta(days=5),
    )
    defaults.update(kwargs)
    return BidCreate(**defaults)


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_rfq_schema_rejects_invalid_dates():
    """Pydantic schema must reject Forced Close Time <= Bid Close Time."""
    now = now_utc()
    with pytest.raises(ValueError, match="Forced Bid Close Time"):
        RFQCreate(
            rfq_number="INVALID-1",
            title="Invalid RFQ",
            pickup_service_date=now + timedelta(days=1),
            bid_start_time=now,
            bid_close_time=now + timedelta(minutes=20),
            forced_bid_close_time=now + timedelta(minutes=10),  # ← must be greater
        )


def test_any_bid_triggers_extension(db):
    """ANY_BID: a bid inside the trigger window must extend the auction by Y minutes."""
    rfq, now = make_rfq(db, trigger_type="ANY_BID", window=10, ext_duration=5, close_in_min=5)
    original_close = rfq.current_bid_close_time

    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Alpha"), simulated_time=now)
    db.refresh(rfq)

    assert rfq.current_bid_close_time == original_close + timedelta(minutes=5)


def test_bid_outside_window_no_extension(db):
    """A bid arriving well before the trigger window must NOT extend the auction."""
    rfq, now = make_rfq(db, trigger_type="ANY_BID", window=5, ext_duration=5, close_in_min=20)
    original_close = rfq.current_bid_close_time

    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Beta"), simulated_time=now)
    db.refresh(rfq)

    assert rfq.current_bid_close_time == original_close


def test_l1_rank_change_triggers_extension(db):
    """L1_RANK_CHANGE: extension fires only when the lowest bidder changes."""
    rfq, now = make_rfq(db, trigger_type="L1_RANK_CHANGE", window=10, ext_duration=5, close_in_min=5)

    # Alpha becomes L1 at $600
    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Alpha",
               freight_charges=400.0, origin_charges=100.0, destination_charges=100.0), simulated_time=now)
    db.refresh(rfq)
    close_after_alpha = rfq.current_bid_close_time

    # Beta bids $700 — higher than Alpha, so L1 is unchanged → NO extension
    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Beta",
               freight_charges=500.0, origin_charges=100.0, destination_charges=100.0), simulated_time=now)
    db.refresh(rfq)
    assert rfq.current_bid_close_time == close_after_alpha

    # Gamma bids $500 — lower than Alpha, Gamma becomes L1 → EXTENSION
    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Gamma",
               freight_charges=300.0, origin_charges=100.0, destination_charges=100.0), simulated_time=now)
    db.refresh(rfq)
    assert rfq.current_bid_close_time == close_after_alpha + timedelta(minutes=5)


def test_extension_capped_at_forced_close_time(db):
    """
    Critical rule: extensions MUST NOT push close time beyond forced_bid_close_time.
    close_in=2, forced_in=4, extension=5 → 2+5=7 > 4, so cap at 4.
    """
    rfq, now = make_rfq(db, trigger_type="ANY_BID", window=10, ext_duration=5,
                         close_in_min=2, forced_in_min=4)
    forced_close = rfq.forced_bid_close_time

    submit_bid(db, rfq.id, make_bid_payload(), simulated_time=now)
    db.refresh(rfq)

    assert rfq.current_bid_close_time == forced_close


def test_no_further_extension_at_forced_ceiling(db):
    """Once at Forced Close Time, subsequent bids must not extend further."""
    rfq, now = make_rfq(db, trigger_type="ANY_BID", window=10, ext_duration=5,
                         close_in_min=2, forced_in_min=4)
    forced_close = rfq.forced_bid_close_time

    # First bid caps the close time at forced ceiling
    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Alpha"), simulated_time=now)
    db.refresh(rfq)
    assert rfq.current_bid_close_time == forced_close

    # Second bid — still within trigger window, but already at ceiling
    submit_bid(db, rfq.id, make_bid_payload(carrier_name="Beta"), simulated_time=now)
    db.refresh(rfq)
    assert rfq.current_bid_close_time == forced_close


def test_bid_rejected_on_closed_auction(db):
    """Closed and Force Closed auctions must reject new bids."""
    rfq, now = make_rfq(db, close_in_min=-5, forced_in_min=-2)
    with pytest.raises(ValueError, match="Auction is"):
        submit_bid(db, rfq.id, make_bid_payload(), simulated_time=now)
