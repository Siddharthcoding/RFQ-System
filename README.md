# British Auction RFQ System

A simplified, modular Request for Quotation (RFQ) system featuring **British Auction** mechanics, dynamic bid-time extensions, and guaranteed forced close rules.

Built with **FastAPI** (Python) and **React.js** (Vite).

---

## 1. High-Level Design (HLD)

### Architecture Overview

The system follows a clean client-server architecture:
- **Frontend (React.js + Vite)**: Interactive single-page application for buyers and suppliers. Displays live auctions, countdown timers, trigger-window indicators, quote submission forms, and real-time activity logs.
- **Backend (FastAPI)**: High-performance RESTful API responsible for auction lifecycle management, rule enforcement, bid processing, and extension calculations.
- **Database (PostgreSQL + SQLAlchemy)**: Relational PostgreSQL database tracking RFQs, bids, and historical activity logs with connection pooling and ACID guarantees.

```mermaid
graph TD
    subgraph Frontend["React.js Frontend (Vite)"]
        UI_List["Auction Listing Page<br/>(Live Status, Lowest Bid, Countdown)"]
        UI_Detail["Auction Detail Page<br/>(Supplier Rankings L1/L2/L3, Specs)"]
        UI_BidForm["Quote Submission Form<br/>(Charges Breakdown & Simulation)"]
        UI_Log["Activity Log & Extensions Timeline"]
    end

    subgraph Backend["FastAPI Backend"]
        Router["API Router (/api/rfqs)"]
        AuctionEngine["British Auction Engine<br/>(Extension Evaluator)"]
        Validator["Validation & Guardrails<br/>(Forced Close Cap, Date checks)"]
        Ranker["Supplier Ranking Service<br/>(L1, L2, L3 Computation)"]
    end

    subgraph Database["Database (PostgreSQL)"]
        T_RFQ[("rfqs Table")]
        T_Bid[("bids Table")]
        T_Log[("activity_logs Table")]
    end

    UI_List -->|HTTP GET /api/rfqs| Router
    UI_Detail -->|HTTP GET /api/rfqs/:id| Router
    UI_BidForm -->|HTTP POST /api/rfqs/:id/bids| Router
    Router --> AuctionEngine
    AuctionEngine --> Validator
    AuctionEngine --> Ranker
    Router --> T_RFQ
    Router --> T_Bid
    Router --> T_Log
```

---

## 2. Database Schema Design

### Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    RFQs ||--o{ Bids : "receives"
    RFQs ||--o{ ActivityLogs : "tracks"

    RFQs {
        int id PK
        string rfq_number UK
        string title
        datetime pickup_service_date
        boolean is_british_auction
        datetime bid_start_time
        datetime initial_bid_close_time
        datetime current_bid_close_time
        datetime forced_bid_close_time
        int trigger_window_minutes
        int extension_duration_minutes
        string extension_trigger_type
        datetime created_at
    }

    Bids {
        int id PK
        int rfq_id FK
        string carrier_name
        float freight_charges
        float origin_charges
        float destination_charges
        float total_price
        string transit_time
        datetime validity_of_quote
        datetime submitted_at
    }

    ActivityLogs {
        int id PK
        int rfq_id FK
        string event_type
        string carrier_name
        float bid_amount
        datetime previous_close_time
        datetime new_close_time
        text reason
        datetime created_at
    }
```

### Table Definitions

1. **`rfqs`**: Stores RFQ definition, auction timing, and configuration.
   - `id`: Primary key (Integer).
   - `rfq_number`: Unique reference code (e.g., `RFQ-2026-001`).
   - `title`: Procurement item/service description.
   - `pickup_service_date`: Requested service or shipment pickup date.
   - `is_british_auction`: Flag enabling British Auction mechanics.
   - `bid_start_time`: When bidding opens.
   - `initial_bid_close_time`: Initial planned auction closing time.
   - `current_bid_close_time`: Dynamically extended closing time.
   - `forced_bid_close_time`: Hard ceiling; bidding stops regardless of activity.
   - `trigger_window_minutes` (X): Time window before close monitored for triggers.
   - `extension_duration_minutes` (Y): Extension added when triggered.
   - `extension_trigger_type`: Extension mode (`ANY_BID`, `ANY_RANK_CHANGE`, or `L1_RANK_CHANGE`).

2. **`bids`**: Stores submitted quotes.
   - `id`: Primary key.
   - `rfq_id`: Foreign key referencing `rfqs.id`.
   - `carrier_name`: Name of the bidding supplier.
   - `freight_charges`, `origin_charges`, `destination_charges`: Breakdown components.
   - `total_price`: Computed sum of all charges.
   - `transit_time`: Promised transit duration.
   - `validity_of_quote`: Expiration date of the offered quote.
   - `submitted_at`: Timestamp of submission.

3. **`activity_logs`**: Complete audit trail of events.
   - `id`: Primary key.
   - `rfq_id`: Foreign key referencing `rfqs.id`.
   - `event_type`: `RFQ_CREATED`, `BID_SUBMISSION`, `TIME_EXTENSION`.
   - `carrier_name`: Associated supplier (if applicable).
   - `bid_amount`: Total bid value (if applicable).
   - `previous_close_time` & `new_close_time`: Close time shift tracking.
   - `reason`: Detailed human-readable justification for the extension.

---

## 3. British Auction Business Logic & Rules

### Core Rules

1. **Trigger Window (X Minutes)**:
   - **Formula**: `Trigger Window = [Current Close - X minutes, Current Close]`
   - Only bids arriving inside this window can trigger an extension.

2. **Extension Duration (Y Minutes)**:
   - When triggered, tentative new close time is:
     `Tentative Close Time = Current Close Time + Y minutes`

3. **Forced Close Time Rule (Hard Ceiling)**:
   - **Rule**: The auction must never extend beyond the Forced Bid Close Time.
   - **Formula**:
     `New Close Time = min(Tentative Close Time, Forced Bid Close Time)`
   - If `Current Close Time == Forced Bid Close Time`, no further extensions can occur.

4. **Extension Trigger Conditions**:
   - `ANY_BID`: Any new bid submitted inside the trigger window extends the auction.
   - `ANY_RANK_CHANGE`: Any shift in supplier leaderboard ranking extends the auction.
   - `L1_RANK_CHANGE`: Extends *only* when the lowest-priced supplier (L1) changes.

5. **Supplier Ranking**:
   Suppliers are ranked L1, L2, L3, ... based on their lowest submitted total price in ascending order.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rfqs` | List all British Auctions with status, lowest bid, and countdown |
| `POST` | `/api/rfqs` | Create a new RFQ with British Auction configuration |
| `GET` | `/api/rfqs/{id}` | Get RFQ details, ranked supplier bids, and activity log |
| `POST` | `/api/rfqs/{id}/bids` | Submit a quote (supports optional `simulated_time` for testing) |
| `POST` | `/api/rfqs/seed-demo-data` | Pre-populate realistic test scenarios |

---

## 5. Quickstart & Running Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL (Local installation or Docker)

### 1. Database Setup (PostgreSQL)

You can run PostgreSQL locally or using the included Docker Compose file:

**Option A — Using Docker (Recommended, zero install):**
```bash
docker compose up -d
```
This starts PostgreSQL 16 on `localhost:5432` with user `postgres`, password `postgres`, and database `rfq_system`.

**Option B — Local PostgreSQL:**
Make sure PostgreSQL is running, then create the database:
```sql
CREATE DATABASE rfq_system;
```
Configure your credentials in `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rfq_system
```

Optional initialization script to verify connection and auto-create tables:
```bash
python backend/init_db.py
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API will be accessible at: `http://localhost:8000`
- Interactive Swagger docs at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Frontend will run at: `http://localhost:3000`

### 4. Running Unit Tests
```bash
pytest backend/test_auction.py -v
```
All unit tests validate:
- Date constraints (`forced_close > close > start`)
- Trigger window window evaluation
- `ANY_BID`, `ANY_RANK_CHANGE`, and `L1_RANK_CHANGE` extension rules
- Forced Bid Close Time capping
- Rejection of bids on closed auctions
