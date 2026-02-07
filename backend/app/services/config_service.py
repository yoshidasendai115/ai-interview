"""Service for evaluation config CRUD operations."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation_config import EvaluationConfig, EvaluationConfigHistory
from app.schemas.evaluation_config import (
    ConfigHistoryListResponse,
    ConfigHistoryResponse,
    EvaluationConfigListResponse,
    EvaluationConfigResponse,
    EvaluationConfigUpdateRequest,
    validate_config_value,
)


class ConfigService:
    """Service for evaluation configuration operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all_configs(self) -> EvaluationConfigListResponse:
        """Get all evaluation configs."""
        stmt = select(EvaluationConfig).order_by(EvaluationConfig.config_key)
        result = await self.db.execute(stmt)
        configs = result.scalars().all()

        return EvaluationConfigListResponse(
            configs=[self._to_response(c) for c in configs]
        )

    async def get_config(self, config_key: str) -> EvaluationConfigResponse | None:
        """Get a single evaluation config by key."""
        config = await self._get_by_key(config_key)
        if config is None:
            return None
        return self._to_response(config)

    async def update_config(
        self,
        config_key: str,
        request: EvaluationConfigUpdateRequest,
        admin_id: str,
    ) -> EvaluationConfigResponse | None:
        """Update an evaluation config with validation and history tracking."""
        config = await self._get_by_key(config_key)
        if config is None:
            return None

        # Validate the new config value
        validated_value = validate_config_value(config_key, request.config_value)

        # Store previous value for history
        previous_value = config.config_value

        # Create history record
        history = EvaluationConfigHistory(
            config_id=config.id,
            config_key=config_key,
            previous_value=previous_value,
            new_value=validated_value,
            version=config.version + 1,
            changed_by=uuid.UUID(admin_id),
        )
        self.db.add(history)

        # Update config
        config.config_value = validated_value
        config.version += 1
        config.updated_by = uuid.UUID(admin_id)
        if request.description is not None:
            config.description = request.description

        await self.db.commit()
        await self.db.refresh(config)

        return self._to_response(config)

    async def get_config_history(
        self,
        config_key: str,
        limit: int = 20,
        offset: int = 0,
    ) -> ConfigHistoryListResponse:
        """Get change history for a config key."""
        # Count total
        count_stmt = (
            select(func.count(EvaluationConfigHistory.id))
            .where(EvaluationConfigHistory.config_key == config_key)
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        # Get history entries
        stmt = (
            select(EvaluationConfigHistory)
            .where(EvaluationConfigHistory.config_key == config_key)
            .order_by(EvaluationConfigHistory.changed_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        history_entries = result.scalars().all()

        return ConfigHistoryListResponse(
            history=[
                ConfigHistoryResponse(
                    id=str(h.id),
                    config_key=h.config_key,
                    previous_value=h.previous_value,
                    new_value=h.new_value,
                    version=h.version,
                    changed_by=str(h.changed_by) if h.changed_by else None,
                    changed_at=h.changed_at,
                )
                for h in history_entries
            ],
            total=total,
        )

    async def _get_by_key(self, config_key: str) -> EvaluationConfig | None:
        """Get config by key."""
        stmt = select(EvaluationConfig).where(
            EvaluationConfig.config_key == config_key
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def _to_response(config: EvaluationConfig) -> EvaluationConfigResponse:
        """Convert model to response schema."""
        return EvaluationConfigResponse(
            id=str(config.id),
            config_key=config.config_key,
            config_value=config.config_value,
            description=config.description,
            version=config.version,
            updated_by=str(config.updated_by) if config.updated_by else None,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )
