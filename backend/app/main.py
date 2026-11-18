"""
Application entry point.
Registers routers and configures middleware.
No business logic lives here.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.rfq.router import router as rfq_router
from app.bid.router import router as bid_router
from app.admin.router import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    try:
        Base.metadata.create_all(bind=engine)
        # Auto-seed demo data if the database is empty
        db = SessionLocal()
        try:
            from app.seeder import seed_demo_data
            seed_demo_data(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[Startup] DB connection issue: {e}")
        print("Ensure PostgreSQL is running and backend/.env DATABASE_URL is correct.")
    yield


app = FastAPI(
    title="British Auction RFQ System",
    description="RFQ procurement system with British Auction mechanics — dynamic extensions, forced close, and supplier ranking.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register domain routers
app.include_router(rfq_router)
app.include_router(bid_router)
app.include_router(admin_router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "online", "docs": "/docs"}
