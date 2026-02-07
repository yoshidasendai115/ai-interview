"""Evaluation config schemas with validation."""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


# ============================================
# JLPT Config schemas
# ============================================


class JLPTLevelWeights(BaseModel):
    """Weight distribution for a single JLPT level. Must sum to 1.0."""

    vocabulary: float = Field(ge=0.0, le=1.0)
    grammar: float = Field(ge=0.0, le=1.0)
    content: float = Field(ge=0.0, le=1.0)
    honorifics: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_weights_sum(self) -> "JLPTLevelWeights":
        total = self.vocabulary + self.grammar + self.content + self.honorifics
        if abs(total - 1.0) > 0.001:
            msg = f"Weights must sum to 1.0 (got {total:.4f})"
            raise ValueError(msg)
        return self


class JLPTLevelSettings(BaseModel):
    """Settings for a single JLPT level."""

    speechRate: float = Field(ge=0.1, le=2.0)
    useSimplified: bool
    followUpDepth: int = Field(ge=0, le=10)


class JLPTWeightsMap(BaseModel):
    """Weights for all JLPT levels."""

    N1: JLPTLevelWeights
    N2: JLPTLevelWeights
    N3: JLPTLevelWeights
    N4: JLPTLevelWeights
    N5: JLPTLevelWeights


class JLPTSettingsMap(BaseModel):
    """Settings for all JLPT levels."""

    N1: JLPTLevelSettings
    N2: JLPTLevelSettings
    N3: JLPTLevelSettings
    N4: JLPTLevelSettings
    N5: JLPTLevelSettings


class EstimationRanges(BaseModel):
    """Score thresholds for estimating JLPT level."""

    N1: int = Field(ge=0, le=100)
    N2: int = Field(ge=0, le=100)
    N3: int = Field(ge=0, le=100)
    N4: int = Field(ge=0, le=100)
    N5: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_descending_order(self) -> "EstimationRanges":
        if not (self.N1 > self.N2 > self.N3 > self.N4 > self.N5):
            msg = "Estimation ranges must be in descending order: N1 > N2 > N3 > N4 > N5"
            raise ValueError(msg)
        return self


class JLPTConfigValue(BaseModel):
    """Complete JLPT configuration."""

    weights: JLPTWeightsMap
    settings: JLPTSettingsMap
    estimationRanges: EstimationRanges


# ============================================
# Scoring Config schemas
# ============================================


class GradeThreshold(BaseModel):
    """Single grade threshold entry."""

    grade: str
    label: str
    minScore: int = Field(ge=0, le=100)
    recommendation: str


class PerformanceGrades(BaseModel):
    """Performance grade thresholds."""

    excellentMin: int = Field(ge=0, le=100)
    goodMin: int = Field(ge=0, le=100)
    passMin: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_descending_order(self) -> "PerformanceGrades":
        if not (self.excellentMin > self.goodMin > self.passMin):
            msg = "Performance grades must be in descending order: excellent > good > pass"
            raise ValueError(msg)
        return self


class LevelAdjustment(BaseModel):
    """Level adjustment thresholds."""

    highThreshold: int = Field(ge=0, le=100)
    lowThreshold: int = Field(ge=0, le=100)
    dailyChallengeLimit: int = Field(ge=1, le=100)

    @model_validator(mode="after")
    def validate_threshold_order(self) -> "LevelAdjustment":
        if self.highThreshold <= self.lowThreshold:
            msg = "highThreshold must be greater than lowThreshold"
            raise ValueError(msg)
        return self


class JobSuitabilityEntry(BaseModel):
    """Single job suitability entry."""

    requiredLevel: str
    minScore: int = Field(ge=0, le=100)


class ScoringConfigValue(BaseModel):
    """Complete scoring configuration."""

    gradeThresholds: list[GradeThreshold]
    performanceGrades: PerformanceGrades
    levelAdjustment: LevelAdjustment
    jobSuitability: dict[str, JobSuitabilityEntry]

    @model_validator(mode="after")
    def validate_grade_thresholds_order(self) -> "ScoringConfigValue":
        min_scores = [g.minScore for g in self.gradeThresholds]
        for i in range(len(min_scores) - 1):
            if min_scores[i] < min_scores[i + 1]:
                msg = "gradeThresholds must be in descending order of minScore"
                raise ValueError(msg)
        return self


# ============================================
# Weak Point Config schemas
# ============================================


class WeakPointPriority(BaseModel):
    """Weak point priority calculation parameters."""

    occurrenceMultiplier: int = Field(ge=1, le=100)
    recencyWindowDays: int = Field(ge=1, le=365)
    highThreshold: int = Field(ge=0, le=100)
    mediumThreshold: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_threshold_order(self) -> "WeakPointPriority":
        if self.highThreshold <= self.mediumThreshold:
            msg = "highThreshold must be greater than mediumThreshold"
            raise ValueError(msg)
        return self


class WeakPointConfigValue(BaseModel):
    """Complete weak point configuration."""

    threshold: int = Field(ge=0, le=100)
    tagThreshold: int = Field(ge=1, le=100)
    resolutionCount: int = Field(ge=1, le=100)
    resolutionScore: int = Field(ge=0, le=100)
    priority: WeakPointPriority

    @model_validator(mode="after")
    def validate_resolution_score(self) -> "WeakPointConfigValue":
        if self.resolutionScore <= self.threshold:
            msg = "resolutionScore must be greater than threshold"
            raise ValueError(msg)
        return self


# ============================================
# API Request/Response schemas
# ============================================


class EvaluationConfigResponse(BaseModel):
    """Response for a single evaluation config entry."""

    id: str
    config_key: str
    config_value: dict
    description: str | None
    version: int
    updated_by: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvaluationConfigListResponse(BaseModel):
    """Response for all evaluation configs."""

    configs: list[EvaluationConfigResponse]


class EvaluationConfigUpdateRequest(BaseModel):
    """Request to update an evaluation config."""

    config_value: dict
    description: str | None = None


class ConfigHistoryResponse(BaseModel):
    """Response for a single config history entry."""

    id: str
    config_key: str
    previous_value: dict
    new_value: dict
    version: int
    changed_by: str | None
    changed_at: datetime

    model_config = {"from_attributes": True}


class ConfigHistoryListResponse(BaseModel):
    """Response for config history list."""

    history: list[ConfigHistoryResponse]
    total: int


# ============================================
# Validation dispatch
# ============================================

CONFIG_VALIDATORS: dict[str, type[BaseModel]] = {
    "jlpt_config": JLPTConfigValue,
    "scoring_config": ScoringConfigValue,
    "weak_point_config": WeakPointConfigValue,
}


def validate_config_value(config_key: str, config_value: dict) -> dict:
    """Validate config_value against the schema for the given config_key.

    Returns the validated dict (with defaults applied).
    Raises ValueError if validation fails.
    """
    validator = CONFIG_VALIDATORS.get(config_key)
    if validator is None:
        msg = f"Unknown config_key: {config_key}"
        raise ValueError(msg)

    validated = validator.model_validate(config_value)
    return validated.model_dump()
