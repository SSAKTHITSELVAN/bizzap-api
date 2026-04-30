from app.db.base import engine, Base

# Import all models so Alembic / create_all can see them
from app.models.user import User  # noqa
from app.models.profile import AgenticProfile  # noqa
from app.models.requirement import Requirement  # noqa
from app.models.lead import Lead  # noqa
from app.models.conversation import Conversation, Message  # noqa
from app.models.deal import Deal  # noqa
from app.models.user_config import UserConfig  # noqa
from app.models.requirement_chat import RequirementChat  # noqa


async def init_db():
    """Create all tables on startup (dev only — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully")
