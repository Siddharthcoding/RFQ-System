"""
Bid Schemas — request and response models for quote submission.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BidCreate(BaseModel):
    carrier_name: str = Field(..., min_length=2, max_length=100)
    freight_charges: float = Field(..., ge=0)
    origin_charges: float = Field(..., ge=0)
    destination_charges: float = Field(..., ge=0)
    transit_time: str = Field(..., min_length=1, max_length=50)
    validity_of_quote: datetime


class BidSubmitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rfq_id: int
    carrier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_price: float
    transit_time: str
    validity_of_quote: datetime
    submitted_at: datetime
    rank: str
