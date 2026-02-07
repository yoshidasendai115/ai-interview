"""Public evaluation config endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentAdmin, DbSession
from app.schemas.evaluation_config import (
    ConfigHistoryListResponse,
    EvaluationConfigListResponse,
    EvaluationConfigResponse,
    EvaluationConfigUpdateRequest,
)
from app.services.config_service import ConfigService

router = APIRouter()


# ============================================
# Public endpoints (read-only)
# ============================================


@router.get("/evaluation", response_model=EvaluationConfigListResponse)
async def get_all_evaluation_configs(
    db: DbSession,
) -> EvaluationConfigListResponse:
    """Get all evaluation configuration values."""
    config_service = ConfigService(db)
    return await config_service.get_all_configs()


@router.get("/evaluation/{config_key}", response_model=EvaluationConfigResponse)
async def get_evaluation_config(
    config_key: str,
    db: DbSession,
) -> EvaluationConfigResponse:
    """Get a single evaluation configuration by key."""
    config_service = ConfigService(db)
    result = await config_service.get_config(config_key)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config not found: {config_key}",
        )
    return result


# ============================================
# Admin endpoints (CRUD)
# ============================================


@router.put(
    "/evaluation/{config_key}",
    response_model=EvaluationConfigResponse,
)
async def update_evaluation_config(
    config_key: str,
    request: EvaluationConfigUpdateRequest,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> EvaluationConfigResponse:
    """Update an evaluation configuration. Requires admin authentication."""
    config_service = ConfigService(db)

    try:
        result = await config_service.update_config(
            config_key=config_key,
            request=request,
            admin_id=current_admin["sub"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config not found: {config_key}",
        )
    return result


@router.get(
    "/evaluation/{config_key}/history",
    response_model=ConfigHistoryListResponse,
)
async def get_evaluation_config_history(
    config_key: str,
    db: DbSession,
    current_admin: CurrentAdmin,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> ConfigHistoryListResponse:
    """Get change history for an evaluation configuration. Requires admin authentication."""
    config_service = ConfigService(db)
    return await config_service.get_config_history(
        config_key=config_key,
        limit=limit,
        offset=offset,
    )
