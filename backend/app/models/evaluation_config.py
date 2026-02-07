"""Evaluation configuration models."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.admin import Admin


class EvaluationConfig(Base, TimestampMixin):
    """Evaluation config model - stores evaluation parameters as JSONB."""

    __tablename__ = "evaluation_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    config_key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    config_value: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    updater: Mapped["Admin | None"] = relationship("Admin", foreign_keys=[updated_by])
    history: Mapped[list["EvaluationConfigHistory"]] = relationship(
        "EvaluationConfigHistory",
        back_populates="config",
        cascade="all, delete-orphan",
        order_by="EvaluationConfigHistory.changed_at.desc()",
    )


class EvaluationConfigHistory(Base):
    """Audit log for evaluation config changes."""

    __tablename__ = "evaluation_config_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluation_config.id", ondelete="CASCADE"),
        nullable=False,
    )
    config_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    previous_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    new_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    config: Mapped["EvaluationConfig"] = relationship(
        "EvaluationConfig",
        back_populates="history",
    )
    changer: Mapped["Admin | None"] = relationship("Admin", foreign_keys=[changed_by])
