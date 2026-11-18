"""
Admin Router — utility endpoints (seed demo data, health check).
Not for production use; clearly separated from core domain routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.seeder import seed_demo_data

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post("/seed-demo-data", status_code=200)
def seed(db: Session = Depends(get_db)):
    """Populates realistic demo RFQs for all British Auction trigger scenarios."""
    return seed_demo_data(db)
