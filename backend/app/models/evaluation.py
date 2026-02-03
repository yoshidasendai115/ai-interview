"""Evaluation related database models."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.interview import InterviewSession


class Evaluation(Base):
    """Evaluation model - stores evaluation results for a session."""

    __tablename__ = "evaluations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    mintoku_sync_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
    )
    mintoku_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    session: Mapped["InterviewSession"] = relationship(
        "InterviewSession",
        back_populates="evaluation",
    )
    details: Mapped[list["EvaluationDetail"]] = relationship(
        "EvaluationDetail",
        back_populates="evaluation",
        cascade="all, delete-orphan",
    )
    aptitude_evaluations: Mapped[list["AptitudeEvaluation"]] = relationship(
        "AptitudeEvaluation",
        back_populates="evaluation",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("idx_evaluations_sync", "mintoku_sync_status"),)


class EvaluationDetail(Base):
    """Evaluation detail model - stores Japanese proficiency scores by category."""

    __tablename__ = "evaluation_details"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    evaluation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluations.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    evaluation: Mapped["Evaluation"] = relationship(
        "Evaluation",
        back_populates="details",
    )


class AptitudeEvaluation(Base):
    """Aptitude evaluation model - stores hiring aptitude scores."""

    __tablename__ = "aptitude_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    evaluation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluations.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    score: Mapped[float] = mapped_column(
        Numeric(2, 1),
        nullable=False,
    )
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    evaluation: Mapped["Evaluation"] = relationship(
        "Evaluation",
        back_populates="aptitude_evaluations",
    )

    __table_args__ = (Index("idx_aptitude_eval", "evaluation_id"),)
