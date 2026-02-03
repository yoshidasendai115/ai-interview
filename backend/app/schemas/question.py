"""Question related schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuestionBankCreate(BaseModel):
    """Schema for creating a question."""

    category_id: str
    question_ja: str = Field(min_length=1)
    question_simplified: str = Field(min_length=1)
    question_reading: str | None = None
    difficulty: int = Field(ge=1, le=3)
    industries: list[str] = Field(default_factory=lambda: ["all"])
    evaluation_points: list[str] | None = None
    follow_ups: list[dict[str, Any]] | None = None
    good_answer_indicators: list[str] | None = None
    red_flags: list[str] | None = None
    is_ice_breaker: bool = False
    is_condition_check: bool = False
    is_closing_statement: bool = False
    source: str | None = None


class QuestionBankUpdate(BaseModel):
    """Schema for updating a question."""

    category_id: str | None = None
    question_ja: str | None = Field(None, min_length=1)
    question_simplified: str | None = Field(None, min_length=1)
    question_reading: str | None = None
    difficulty: int | None = Field(None, ge=1, le=3)
    industries: list[str] | None = None
    evaluation_points: list[str] | None = None
    follow_ups: list[dict[str, Any]] | None = None
    good_answer_indicators: list[str] | None = None
    red_flags: list[str] | None = None
    is_ice_breaker: bool | None = None
    is_condition_check: bool | None = None
    is_closing_statement: bool | None = None
    source: str | None = None


class QuestionBankResponse(BaseModel):
    """Response schema for a question."""

    id: str
    category_id: str
    question_ja: str
    question_simplified: str
    question_reading: str | None = None
    difficulty: int
    industries: list[str]
    evaluation_points: list[str] | None = None
    follow_ups: list[dict[str, Any]] | None = None
    good_answer_indicators: list[str] | None = None
    red_flags: list[str] | None = None
    is_ice_breaker: bool
    is_condition_check: bool
    is_closing_statement: bool
    source: str | None = None
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionListResponse(BaseModel):
    """Response schema for question list."""

    questions: list[QuestionBankResponse]
    total: int
    limit: int
    offset: int


class QuestionCategoryResponse(BaseModel):
    """Response schema for question category."""

    id: str
    name: str
    name_en: str
    time_axis: str | None = None
    duration_minutes: int
    display_order: int
    description: str | None = None
    purpose: str | None = None

    model_config = {"from_attributes": True}


class IndustryResponse(BaseModel):
    """Response schema for industry."""

    id: str
    name: str
    name_en: str
    specific_skill_category: str | None = None
    description: str | None = None
    key_requirements: list[str] | None = None
    priority_evaluation_categories: list[str] | None = None
    common_job_titles: list[str] | None = None
    physical_demands: str | None = None
    communication_level_required: str | None = None

    model_config = {"from_attributes": True}
