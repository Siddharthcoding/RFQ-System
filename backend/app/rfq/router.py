"""
RFQ Router — HTTP layer only.
Receives requests, calls the service, returns responses.
No business logic, no DB queries here.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.rfq.schemas import RFQCreate, RFQListItem, RFQDetailResponse
from app.rfq import service as rfq_service

router = APIRouter(prefix="/api/rfqs", tags=["RFQs"])


@router.get("", response_model=List[RFQListItem])
def list_rfqs(db: Session = Depends(get_db)):
    """List all British Auction RFQs with status and current lowest bid."""
    return rfq_service.list_rfqs(db)


@router.post("", response_model=RFQDetailResponse, status_code=201)
def create_rfq(payload: RFQCreate, db: Session = Depends(get_db)):
    """Create a new RFQ with British Auction configuration."""
    try:
        return rfq_service.create_rfq(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{rfq_id}", response_model=RFQDetailResponse)
def get_rfq(rfq_id: int, db: Session = Depends(get_db)):
    """Get full RFQ details with ranked bids and activity log."""
    try:
        return rfq_service.get_rfq_detail(db, rfq_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
