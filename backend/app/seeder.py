"""
Demo Data Seeder — isolated from routes and services.
Populates realistic RFQs covering all British Auction trigger scenarios.
Only runs when the database is empty.
"""
from datetime import timedelta
from sqlalchemy.orm import Session

from app.models import RFQ, Bid, ActivityLog
from app.utils import now_utc


def seed_demo_data(db: Session) -> dict:
    if db.query(RFQ).count() > 0:
        return {"message": "Database already has data — skipping seed."}

    now = now_utc()

    _seed_rfq_any_bid(db, now)
    _seed_rfq_l1_rank_change(db, now)
    _seed_rfq_near_forced_close(db, now)
    _seed_rfq_closed(db, now)

    db.commit()
    return {"message": "Demo data seeded successfully with 4 British Auction scenarios."}


# ── Individual scenario seeders ───────────────────────────────────────────────

def _seed_rfq_any_bid(db: Session, now) -> None:
    """Scenario 1: Active auction, 6 mins to close, ANY_BID trigger. Submit a bid to trigger extension."""
    rfq = RFQ(
        rfq_number="RFQ-2026-001",
        title="Automotive Parts — Detroit to Chicago Expedited",
        pickup_service_date=now + timedelta(days=5),
        is_british_auction=True,
        bid_start_time=now - timedelta(hours=2),
        initial_bid_close_time=now + timedelta(minutes=6),
        current_bid_close_time=now + timedelta(minutes=6),
        forced_bid_close_time=now + timedelta(minutes=30),
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID",
    )
    db.add(rfq)
    db.flush()

    db.add_all([
        Bid(rfq_id=rfq.id, carrier_name="Swift Logistics",
            freight_charges=1200.0, origin_charges=150.0, destination_charges=150.0,
            total_price=1500.0, transit_time="2 Days",
            validity_of_quote=now + timedelta(days=10),
            submitted_at=now - timedelta(minutes=45)),
        Bid(rfq_id=rfq.id, carrier_name="Apex Freight Lines",
            freight_charges=1100.0, origin_charges=120.0, destination_charges=130.0,
            total_price=1350.0, transit_time="2 Days",
            validity_of_quote=now + timedelta(days=10),
            submitted_at=now - timedelta(minutes=25)),
        ActivityLog(rfq_id=rfq.id, event_type="RFQ_CREATED",
                    reason="RFQ created. Trigger=ANY_BID, Window=10m, Extension=5m.",
                    created_at=now - timedelta(hours=2)),
        ActivityLog(rfq_id=rfq.id, event_type="BID_SUBMISSION",
                    carrier_name="Swift Logistics", bid_amount=1500.0,
                    reason="Quote submitted by Swift Logistics for $1,500.00",
                    created_at=now - timedelta(minutes=45)),
        ActivityLog(rfq_id=rfq.id, event_type="BID_SUBMISSION",
                    carrier_name="Apex Freight Lines", bid_amount=1350.0,
                    reason="Quote submitted by Apex Freight Lines for $1,350.00",
                    created_at=now - timedelta(minutes=25)),
    ])


def _seed_rfq_l1_rank_change(db: Session, now) -> None:
    """Scenario 2: Active auction, L1_RANK_CHANGE trigger. Extension fires only when lowest bidder changes."""
    rfq = RFQ(
        rfq_number="RFQ-2026-002",
        title="Temperature Controlled Pharma — Mumbai to Delhi",
        pickup_service_date=now + timedelta(days=7),
        is_british_auction=True,
        bid_start_time=now - timedelta(hours=3),
        initial_bid_close_time=now + timedelta(minutes=8),
        current_bid_close_time=now + timedelta(minutes=8),
        forced_bid_close_time=now + timedelta(minutes=45),
        trigger_window_minutes=15,
        extension_duration_minutes=8,
        extension_trigger_type="L1_RANK_CHANGE",
    )
    db.add(rfq)
    db.flush()

    db.add_all([
        Bid(rfq_id=rfq.id, carrier_name="ColdChain Express",
            freight_charges=2400.0, origin_charges=200.0, destination_charges=250.0,
            total_price=2850.0, transit_time="36 Hours",
            validity_of_quote=now + timedelta(days=14),
            submitted_at=now - timedelta(hours=1)),
        ActivityLog(rfq_id=rfq.id, event_type="RFQ_CREATED",
                    reason="RFQ created. Trigger=L1_RANK_CHANGE, Window=15m, Extension=8m.",
                    created_at=now - timedelta(hours=3)),
        ActivityLog(rfq_id=rfq.id, event_type="BID_SUBMISSION",
                    carrier_name="ColdChain Express", bid_amount=2850.0,
                    reason="Quote submitted by ColdChain Express for $2,850.00",
                    created_at=now - timedelta(hours=1)),
    ])


def _seed_rfq_near_forced_close(db: Session, now) -> None:
    """Scenario 3: Auction is 2 mins from close but Forced Close is only 3 mins away. Extension will be capped."""
    rfq = RFQ(
        rfq_number="RFQ-2026-003",
        title="Heavy Machinery Transport — Dallas to Atlanta",
        pickup_service_date=now + timedelta(days=3),
        is_british_auction=True,
        bid_start_time=now - timedelta(hours=4),
        initial_bid_close_time=now - timedelta(minutes=10),
        current_bid_close_time=now + timedelta(minutes=2),
        forced_bid_close_time=now + timedelta(minutes=3),
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID",
    )
    db.add(rfq)
    db.flush()
    db.add(ActivityLog(rfq_id=rfq.id, event_type="RFQ_CREATED",
                       reason="RFQ created. Close time near Forced Close — extension will be capped.",
                       created_at=now - timedelta(hours=4)))


def _seed_rfq_closed(db: Session, now) -> None:
    """Scenario 4: Already force-closed auction — for displaying historical state."""
    rfq = RFQ(
        rfq_number="RFQ-2026-004",
        title="Consumer Electronics — Shenzhen to Long Beach",
        pickup_service_date=now + timedelta(days=12),
        is_british_auction=True,
        bid_start_time=now - timedelta(days=2),
        initial_bid_close_time=now - timedelta(hours=1),
        current_bid_close_time=now - timedelta(hours=1),
        forced_bid_close_time=now - timedelta(minutes=30),
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID",
    )
    db.add(rfq)
    db.flush()
    db.add(ActivityLog(rfq_id=rfq.id, event_type="RFQ_CREATED",
                       reason="RFQ created.",
                       created_at=now - timedelta(days=2)))
