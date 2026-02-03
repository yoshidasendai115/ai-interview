"""Question-related database models."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.interview import InterviewSession


class QuestionCategory(Base, TimestampMixin):
    """Question category master table."""

    __tablename__ = "question_categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    time_axis: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    questions: Mapped[list["QuestionBank"]] = relationship(
        "QuestionBank",
        back_populates="category",
    )


class Industry(Base, TimestampMixin):
    """Industry master table."""

    __tablename__ = "industries"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    specific_skill_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_requirements: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    priority_evaluation_categories: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    common_job_titles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    physical_demands: Mapped[str | None] = mapped_column(String(20), nullable=True)
    communication_level_required: Mapped[str | None] = mapped_column(String(2), nullable=True)
    additional_questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class QuestionBank(Base, TimestampMixin, SoftDeleteMixin):
    """Question bank - stores all interview questions."""

    __tablename__ = "question_bank"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("question_categories.id"),
        nullable=False,
    )
    question_ja: Mapped[str] = mapped_column(Text, nullable=False)
    question_simplified: Mapped[str] = mapped_column(Text, nullable=False)
    question_reading: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    industries: Mapped[list] = mapped_column(JSONB, nullable=False, default=["all"])
    evaluation_points: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    follow_ups: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    good_answer_indicators: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    red_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_ice_breaker: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_condition_check: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_closing_statement: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    category: Mapped["QuestionCategory"] = relationship(
        "QuestionCategory",
        back_populates="questions",
    )

    __table_args__ = (
        Index("idx_qbank_category", "category_id"),
        Index("idx_qbank_difficulty", "difficulty"),
    )


class ScenarioTemplate(Base, TimestampMixin):
    """Scenario template for different industries and JLPT levels."""

    __tablename__ = "scenario_templates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    jlpt_levels: Mapped[list] = mapped_column(JSONB, nullable=False)
    industries: Mapped[list] = mapped_column(JSONB, nullable=False)
    flow: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Relationships
    template_questions: Mapped[list["ScenarioTemplateQuestion"]] = relationship(
        "ScenarioTemplateQuestion",
        back_populates="template",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("idx_templates_industry", "industries"),)


class ScenarioTemplateQuestion(Base):
    """Association table for scenario templates and questions."""

    __tablename__ = "scenario_template_questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    template_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("scenario_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("question_bank.id", ondelete="RESTRICT"),
        nullable=False,
    )
    phase: Mapped[str] = mapped_column(String(50), nullable=False)
    order_in_phase: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    template: Mapped["ScenarioTemplate"] = relationship(
        "ScenarioTemplate",
        back_populates="template_questions",
    )
    question: Mapped["QuestionBank"] = relationship("QuestionBank")

    __table_args__ = (
        Index("idx_stq_template", "template_id"),
        Index("idx_stq_question", "question_id"),
    )


class Script(Base, TimestampMixin):
    """Interview script - synced from mintoku work."""

    __tablename__ = "scripts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    mintoku_script_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    job_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    jlpt_level: Mapped[str] = mapped_column(String(2), nullable=False)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    synced_at: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    questions: Mapped[list["ScriptQuestion"]] = relationship(
        "ScriptQuestion",
        back_populates="script",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list["InterviewSession"]] = relationship(
        "InterviewSession",
        back_populates="script",
    )

    __table_args__ = (Index("idx_scripts_jlpt", "jlpt_level", "is_active"),)


class ScriptQuestion(Base, SoftDeleteMixin):
    """Questions within a script."""

    __tablename__ = "script_questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    script_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scripts.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evaluation_criteria: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    script: Mapped["Script"] = relationship("Script", back_populates="questions")

    # Note: Foreign key constraint is defined with ON DELETE RESTRICT
    # to prevent deletion of questions that have associated answers
