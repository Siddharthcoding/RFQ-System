"""
RFQ Schemas — Pydantic models for request validation and response serialisation.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RFQCreate(BaseModel):
    rfq_number: str = Field(..., min_length=2, max_length=50)
    title: str = Field(..., min_length=3, max_length=200)
    pickup_service_date: datetime
    is_british_auction: bool = True
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    trigger_window_minutes: int = Field(default=10, ge=1, le=120)
    extension_duration_minutes: int = Field(default=5, ge=1, le=120)
    extension_trigger_type: str = Field(default="ANY_BID")

    @field_validator("extension_trigger_type")
    def validate_trigger_type(cls, v):
        allowed = {"ANY_BID", "ANY_RANK_CHANGE", "L1_RANK_CHANGE"}
        if v not in allowed:
            raise ValueError(f"Must be one of {allowed}")
        return v

    @model_validator(mode="after")
    def validate_time_order(self):
        if self.bid_close_time <= self.bid_start_time:
            raise ValueError("Bid Close Time must be later than Bid Start Time.")
        if self.forced_bid_close_time <= self.bid_close_time:
            raise ValueError("Forced Bid Close Time must be strictly greater than Bid Close Time.")
        return self


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rfq_id: int
    event_type: str
    carrier_name: Optional[str] = None
    bid_amount: Optional[float] = None
    previous_close_time: Optional[datetime] = None
    new_close_time: Optional[datetime] = None
    reason: str
    created_at: datetime


class BidResponse(BaseModel):
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
    rank: Optional[str] = None


class RFQListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rfq_number: str
    title: str
    is_british_auction: bool
    pickup_service_date: datetime
    bid_start_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    current_lowest_bid: Optional[float] = None
    lowest_bidder_carrier: Optional[str] = None
    total_bids_count: int
    status: str
    is_in_trigger_window: bool
    time_remaining_seconds: float


class RFQDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rfq_number: str
    title: str
    is_british_auction: bool
    pickup_service_date: datetime
    bid_start_time: datetime
    initial_bid_close_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: str
    status: str
    current_lowest_bid: Optional[float] = None
    lowest_bidder_carrier: Optional[str] = None
    is_in_trigger_window: bool
    time_remaining_seconds: float
    bids: List[BidResponse] = []
    activity_logs: List[ActivityLogResponse] = []
