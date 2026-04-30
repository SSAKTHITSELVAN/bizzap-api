# Bisdom — Backend Project Structure

```
bisdom/
├── app/
│   ├── main.py                          # FastAPI app entry point
│   ├── api/
│   │   └── v1/
│   │       ├── router.py                # All route registrations
│   │       └── endpoints/
│   │           ├── auth.py              # Phone OTP login
│   │           ├── onboarding.py        # GST verify + link profile build
│   │           ├── requirements.py      # Post requirement (buyer flow)
│   │           ├── leads.py             # Matched leads listing
│   │           ├── conversations.py     # Chat (human + AI hybrid)
│   │           ├── profile.py           # Agentic profile management
│   │           └── dashboard.py         # CRM dashboard data
│   ├── core/
│   │   ├── config.py                    # Settings / env vars
│   │   ├── security.py                  # JWT token management
│   │   └── dependencies.py              # FastAPI dependency injection
│   ├── db/
│   │   ├── base.py                      # SQLAlchemy base + session
│   │   └── init_db.py                   # DB initialization
│   ├── models/
│   │   ├── user.py                      # User model
│   │   ├── profile.py                   # Agentic profile model
│   │   ├── requirement.py               # Buyer requirement model
│   │   ├── lead.py                      # Matched lead model
│   │   ├── conversation.py              # Conversation + message models
│   │   └── deal.py                      # Deal / order model
│   ├── schemas/
│   │   ├── auth.py                      # Auth request/response schemas
│   │   ├── onboarding.py                # GST + profile schemas
│   │   ├── requirement.py               # Requirement schemas
│   │   ├── lead.py                      # Lead schemas
│   │   ├── conversation.py              # Chat message schemas
│   │   └── dashboard.py                 # Dashboard schemas
│   ├── services/
│   │   ├── otp_service.py               # OTP generation + verification
│   │   ├── gst_service.py               # GST API verification
│   │   ├── matching_service.py          # Requirement ↔ profile matching
│   │   └── notification_service.py      # Push notifications
│   └── agents/
│       ├── bedrock_client.py            # AWS Bedrock Qwen3 client
│       ├── profile_agent.py             # Builds agentic profile from URLs
│       ├── requirement_agent.py         # Enriches buyer requirement via chat
│       ├── buyer_agent.py               # Buyer-side negotiation agent
│       └── supplier_agent.py            # Supplier-side negotiation agent
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
├── .env
├── alembic.ini
├── requirements.txt
└── README.md
```
uvicorn app.main:app --reload --port 8000