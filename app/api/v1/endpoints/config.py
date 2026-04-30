"""User config endpoint — profile_md, buyer_settings_md, seller_settings_md."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_config import UserConfig
from app.agents.config_agent import DEFAULT_BUYER_SETTINGS, DEFAULT_SELLER_SETTINGS

router = APIRouter(prefix="/config", tags=["User Config"])


class ConfigResponse(BaseModel):
    profile_md: str
    buyer_settings_md: str
    seller_settings_md: str


class UpdateConfigRequest(BaseModel):
    profile_md: Optional[str] = None
    buyer_settings_md: Optional[str] = None
    seller_settings_md: Optional[str] = None


async def get_or_create_config(user_id: int, db: AsyncSession) -> UserConfig:
    result = await db.execute(select(UserConfig).where(UserConfig.user_id == user_id))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = UserConfig(
            user_id=user_id,
            profile_md="",
            buyer_settings_md=DEFAULT_BUYER_SETTINGS,
            seller_settings_md=DEFAULT_SELLER_SETTINGS,
        )
        db.add(cfg)
        await db.flush()
    return cfg


@router.get("/", response_model=ConfigResponse)
async def get_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await get_or_create_config(current_user.id, db)
    return ConfigResponse(
        profile_md=cfg.profile_md or "",
        buyer_settings_md=cfg.buyer_settings_md or DEFAULT_BUYER_SETTINGS,
        seller_settings_md=cfg.seller_settings_md or DEFAULT_SELLER_SETTINGS,
    )


@router.put("/", response_model=ConfigResponse)
async def update_config(
    request: UpdateConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await get_or_create_config(current_user.id, db)
    if request.profile_md is not None:
        cfg.profile_md = request.profile_md
    if request.buyer_settings_md is not None:
        cfg.buyer_settings_md = request.buyer_settings_md
    if request.seller_settings_md is not None:
        cfg.seller_settings_md = request.seller_settings_md
    await db.flush()
    return ConfigResponse(
        profile_md=cfg.profile_md or "",
        buyer_settings_md=cfg.buyer_settings_md or "",
        seller_settings_md=cfg.seller_settings_md or "",
    )
