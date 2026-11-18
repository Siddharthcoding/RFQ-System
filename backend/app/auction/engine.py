"""
British Auction Engine — pure business rules, completely framework-agnostic.

This module has zero knowledge of HTTP, databases, or Pydantic.
It only receives domain model objects and returns plain Python values.
Testable in isolation without any infrastructure.
"""
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Optional

from app.models import RFQ, Bid
from app.utils import now_utc, to_naive_utc

def get_auction_status(rfq: RFQ, current_time: Optional[datetime] = None) -> str:
    """
    Returns one of: 'Upcoming', 'Active', 'Closed', 'Force Closed'
    Priority: Force Closed > Closed > Upcoming > Active
    """
    t = to_naive_utc(current_time) if current_time else now_utc()

    if t >= to_naive_utc(rfq.forced_bid_close_time):
        return "Force Closed"
    if t >= to_naive_utc(rfq.current_bid_close_time):
        return "Closed"
    if t < to_naive_utc(rfq.bid_start_time):
        return "Upcoming"
    return "Active"


def is_in_trigger_window(rfq: RFQ, current_time: Optional[datetime] = None) -> bool:
    """
    True when current_time falls inside [close_time - X minutes, close_time].
    This is the window during which a qualifying bid triggers a time extension.
    """
    t = to_naive_utc(current_time) if current_time else now_utc()
    close = to_naive_utc(rfq.current_bid_close_time)
    window_start = close - timedelta(minutes=rfq.trigger_window_minutes)
    return window_start <= t <= close


def compute_supplier_rankings(bids: List[Bid]) -> List[Tuple[str, float]]:
    """
    Returns [(carrier_name, best_price), ...] sorted ascending by price.
    Each carrier appears only once — their lowest bid wins.
    """
    carrier_best: Dict[str, float] = {}
    for bid in bids:
        if bid.carrier_name not in carrier_best or bid.total_price < carrier_best[bid.carrier_name]:
            carrier_best[bid.carrier_name] = bid.total_price
    return sorted(carrier_best.items(), key=lambda x: x[1])


def assign_ranks_to_bids(bids: List[Bid]) -> List[dict]:
    """
    Returns all bids sorted by price (asc), each decorated with a rank label
    (L1 = lowest, L2, L3, ...) based on their carrier's standing.
    """
    if not bids:
        return []

    sorted_bids = sorted(bids, key=lambda b: (b.total_price, b.submitted_at))
    carrier_rank = {
        carrier: f"L{i + 1}"
        for i, (carrier, _) in enumerate(compute_supplier_rankings(bids))
    }

    return [
        {
            "id": bid.id,
            "rfq_id": bid.rfq_id,
            "carrier_name": bid.carrier_name,
            "freight_charges": bid.freight_charges,
            "origin_charges": bid.origin_charges,
            "destination_charges": bid.destination_charges,
            "total_price": bid.total_price,
            "transit_time": bid.transit_time,
            "validity_of_quote": bid.validity_of_quote,
            "submitted_at": bid.submitted_at,
            "rank": carrier_rank.get(bid.carrier_name, "N/A"),
        }
        for bid in sorted_bids
    ]


def should_extend_auction(
    rfq: RFQ,
    existing_bids: List[Bid],
    new_carrier: str,
    new_total_price: float,
    current_time: datetime,
) -> Tuple[bool, str]:
    """
    Evaluates whether this bid qualifies for a British Auction time extension.

    Returns (should_extend: bool, reason: str)

    Rules evaluated in order:
    1. Must be a British Auction.
    2. Bid must arrive inside the trigger window.
    3. Current close time must be below the forced close ceiling.
    4. The trigger condition (ANY_BID / ANY_RANK_CHANGE / L1_RANK_CHANGE) must be satisfied.
    """
    if not rfq.is_british_auction:
        return False, "Not a British Auction."

    if not is_in_trigger_window(rfq, current_time):
        return False, "Bid arrived outside the trigger window."

    if to_naive_utc(rfq.current_bid_close_time) >= to_naive_utc(rfq.forced_bid_close_time):
        return False, "Already at Forced Bid Close Time — no further extensions allowed."

    return _evaluate_trigger_condition(rfq, existing_bids, new_carrier, new_total_price)


def _evaluate_trigger_condition(
    rfq: RFQ,
    existing_bids: List[Bid],
    new_carrier: str,
    new_total_price: float,
) -> Tuple[bool, str]:
    """Checks the configured trigger condition against the prospective ranking change."""
    trigger = rfq.extension_trigger_type

    old_rankings = compute_supplier_rankings(existing_bids)
    old_carriers = [c for c, _ in old_rankings]
    old_l1 = old_carriers[0] if old_carriers else None

    prospective = dict(old_rankings)
    if new_carrier not in prospective or new_total_price < prospective[new_carrier]:
        prospective[new_carrier] = new_total_price
    new_carriers = [c for c, _ in sorted(prospective.items(), key=lambda x: x[1])]
    new_l1 = new_carriers[0] if new_carriers else None

    if trigger == "ANY_BID":
        return True, f"Bid received in final {rfq.trigger_window_minutes}-minute trigger window."

    if trigger == "L1_RANK_CHANGE":
        if old_l1 is None:
            return True, f"First bid — {new_carrier} established as L1."
        if new_l1 != old_l1:
            return True, f"L1 changed: {old_l1} → {new_l1}."
        return False, f"L1 unchanged ({old_l1}). Extension criteria not met."

    if trigger == "ANY_RANK_CHANGE":
        if old_carriers != new_carriers:
            return True, f"Rankings changed: {old_carriers} → {new_carriers}."
        return False, "No ranking change. Extension criteria not met."

    return False, f"Unknown trigger type: '{trigger}'."
