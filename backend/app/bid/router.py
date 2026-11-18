"""
Bid Router — HTTP layer for quote submission.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.bid.schemas import BidCreate, BidSubmitResponse
from app.bid import service as bid_service

router = APIRouter(prefix="/api/rfqs/{rfq_id}/bids", tags=["Bids"])


@router.post("", response_model=BidSubmitResponse, status_code=201)
def submit_quote(
    rfq_id: int,
    payload: BidCreate,
    simulated_time: Optional[datetime] = Query(
        None,
        description="Optional ISO timestamp to test British Auction extensions without waiting."
    ),
    db: Session = Depends(get_db),
):
    """
    Submit a supplier quote for an RFQ.
    Automatically evaluates British Auction extension rules on each submission.
    """
    try:
        return bid_service.submit_bid(db, rfq_id, payload, simulated_time)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
