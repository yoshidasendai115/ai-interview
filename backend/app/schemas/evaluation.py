"""Evaluation related schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class JapaneseProficiencyScores(BaseModel):
    """Japanese proficiency scores by category."""

    vocabulary: int = Field(ge=0, le=100)
    grammar: int = Field(ge=0, le=100)
    content: int = Field(ge=0, le=100)
    honorifics: int = Field(ge=0, le=100)


class JapaneseProficiencyFeedback(BaseModel):
    """Japanese proficiency feedback by category."""

    vocabulary: str
    grammar: str
    content: str
    honorifics: str


class JapaneseProficiency(BaseModel):
    """Japanese proficiency evaluation result."""

    score: int = Field(ge=0, le=100)
    scores: JapaneseProficiencyScores
    feedback: JapaneseProficiencyFeedback


class AptitudeScores(BaseModel):
    """Aptitude scores by category."""

    adaptability: float = Field(ge=1.0, le=5.0)
    communication: float = Field(ge=1.0, le=5.0)
    initiative: float = Field(ge=1.0, le=5.0)
    retention: float = Field(ge=1.0, le=5.0)
    cooperation: float = Field(ge=1.0, le=5.0)


class AptitudeFeedback(BaseModel):
    """Aptitude feedback by category."""

    adaptability: str
    communication: str
    initiative: str
    retention: str
    cooperation: str


class Aptitude(BaseModel):
    """Aptitude evaluation result."""

    score: float = Field(ge=1.0, le=5.0)
    scores: AptitudeScores
    feedback: AptitudeFeedback


class WeakPointResponse(BaseModel):
    """Weak point information."""

    category: str
    category_type: str  # "japanese_proficiency" or "aptitude"
    description: str
    priority: str
    example: str | None = None


class LevelMismatch(BaseModel):
    """JLPT level mismatch detection result."""

    detected: bool
    declared_level: str
    actual_score: int
    estimated_level: str
    gap_severity: str  # "none", "minor", "major", "critical"
    evidence: list[str]
    recommendation: str


class EvaluationResponse(BaseModel):
    """Response for evaluation results."""

    evaluation_id: str
    session_id: str
    total_score: int
    grade: str
    grade_label: str
    recommendation: str
    japanese_proficiency: JapaneseProficiency
    aptitude: Aptitude
    overall_feedback: str
    weak_points: list[WeakPointResponse]
    level_mismatch: LevelMismatch | None = None
    evaluated_at: datetime


class ScoreTrend(BaseModel):
    """Score trend data point."""

    date: str
    total_score: int
    japanese_proficiency: int
    aptitude: float


class AptitudeSummary(BaseModel):
    """Aptitude evaluation summary."""

    average_scores: AptitudeScores
    strongest: str
    weakest: str


class WeakPointSummary(BaseModel):
    """Weak point summary."""

    category: str
    category_type: str
    label: str
    frequency: int
    priority: str


class EvaluationSummaryResponse(BaseModel):
    """Response for evaluation summary (learning progress)."""

    user_id: str
    total_sessions: int
    average_total_score: int
    average_japanese_proficiency_score: int
    average_aptitude_score: float
    score_trend: list[ScoreTrend]
    weak_points_summary: list[WeakPointSummary]
    aptitude_summary: AptitudeSummary
    practice_time_minutes: int
    jlpt_level: str | None = None
