# Bisdom Backend

AI-powered B2B Commerce Platform — FastAPI + PostgreSQL + AWS Bedrock (Qwen3)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.13) |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| AI Model | Qwen3 VL 235B via AWS Bedrock |
| Auth | JWT (python-jose) |
| HTTP Client | httpx (async) |

---

## Project Structure

```
bisdom/
├── app/
│   ├── main.py                    # FastAPI entry point
│   ├── api/v1/
│   │   ├── router.py              # Route registration
│   │   └── endpoints/
│   │       ├── auth.py            # POST /api/v1/auth/send-otp, /verify-otp
│   │       ├── onboarding.py      # POST /api/v1/onboarding/verify-gst, /complete
│   │       ├── requirements.py    # POST /api/v1/requirements/chat, /confirm
│   │       ├── leads.py           # GET  /api/v1/leads/
│   │       ├── conversations.py   # GET/POST /api/v1/conversations/
│   │       └── dashboard.py       # GET  /api/v1/dashboard/
│   ├── core/
│   │   ├── config.py              # Settings from .env
│   │   ├── security.py            # JWT
│   │   └── dependencies.py        # get_current_user
│   ├── db/
│   │   ├── base.py                # AsyncEngine + session
│   │   └── init_db.py             # create_all on startup
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── services/
│   │   ├── otp_service.py         # OTP (static: 123456)
│   │   ├── gst_service.py         # GST API verification
│   │   └── matching_service.py    # Requirement ↔ supplier matching
│   └── agents/
│       ├── bedrock_client.py      # AWS Bedrock Qwen3 VL client
│       ├── profile_agent.py       # Build profile from URLs
│       ├── requirement_agent.py   # Enrich requirement via chat
│       ├── buyer_agent.py         # Buyer-side negotiation
│       └── supplier_agent.py      # Supplier-side negotiation
├── alembic/                       # DB migrations
├── .env                           # Environment variables
├── requirements.txt
└── README.md
```

---

## Setup

### 1. Prerequisites

- Python 3.13
- PostgreSQL 15+

### 2. Create PostgreSQL database

```bash
psql -U postgres
CREATE USER bisdom WITH PASSWORD 'bisdom123';
CREATE DATABASE bisdom_db OWNER bisdom;
GRANT ALL PRIVILEGES ON DATABASE bisdom_db TO bisdom;
\q
```

### 3. Install dependencies

```bash
cd bisdom
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure environment

Edit `.env` — update DATABASE_URL if your PostgreSQL is on a different host/port.

### 5. Run migrations (optional — app auto-creates tables on startup)

```bash
alembic upgrade head
```

### 6. Start server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Key API Flows

### Login Flow

```
POST /api/v1/auth/send-otp      { "phone": "9876543210" }
POST /api/v1/auth/verify-otp    { "phone": "9876543210", "otp": "123456" }
→ Returns: { access_token, is_new_user, is_onboarded }
```

### Onboarding Flow (new user)

```
POST /api/v1/onboarding/verify-gst    { "gstin": "29AACCG0527D1Z8" }
POST /api/v1/onboarding/complete      { "gstin": "...", "links": ["https://indiamart.com/..."] }
GET  /api/v1/onboarding/profile-status   (poll until status = "complete")
```

### Requirement Flow

```
POST /api/v1/requirements/chat     { "message": "I need 100 cotton t-shirts under ₹200" }
→ AI asks follow-up questions one at a time

POST /api/v1/requirements/chat     { "message": "100% cotton 180GSM", "requirement_id": 1 }
→ Continue conversation

POST /api/v1/requirements/confirm  { "requirement_id": 1 }
→ Triggers matching + agent conversations
```

### Chat / Negotiation

```
GET  /api/v1/conversations/lead/{lead_id}     View full conversation history
POST /api/v1/conversations/send               Send human message
POST /api/v1/conversations/toggle-chat        Enable/disable human chat
POST /api/v1/conversations/buyer-decision     accept | renegotiate | manual_chat | decline
POST /api/v1/conversations/supplier-escalation  accept | counter | hold | decline
```

### Dashboard

```
GET /api/v1/dashboard/     Full CRM dashboard data
GET /api/v1/leads/         All leads (buyer + supplier)
```

---

## Development Notes

- **OTP**: Static `123456` for all numbers in dev mode
- **GST API**: Live — uses `https://sheet.gstincheck.co.in/check`
- **Bedrock**: Qwen3 VL 235B — requires valid bearer token
- **Matching**: Runs async in background after requirement confirmation
- **AI conversations**: Both buyer and supplier agents run autonomously;
  humans can enable manual chat per-lead at any time

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async URL |
| `SECRET_KEY` | JWT signing key |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock bearer token |
| `GST_API_KEY` | GST check API key |
| `STATIC_OTP` | Dev OTP (default: 123456) |
