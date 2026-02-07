"""Pydantic schemas for request/response validation."""

from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    RefreshTokenRequest,
    SSOCallbackRequest,
    TokenResponse,
)
from app.schemas.common import ErrorDetail, ErrorResponse, PaginatedResponse
from app.schemas.evaluation import (
    AptitudeScores,
    EvaluationResponse,
    EvaluationSummaryResponse,
    JapaneseProficiencyScores,
    LevelMismatch,
    ScoreTrend,
    WeakPointResponse,
)
from app.schemas.evaluation_config import (
    ConfigHistoryListResponse,
    ConfigHistoryResponse,
    EvaluationConfigListResponse,
    EvaluationConfigResponse,
    EvaluationConfigUpdateRequest,
)
from app.schemas.question import (
    QuestionBankCreate,
    QuestionBankResponse,
    QuestionBankUpdate,
    QuestionListResponse,
)
from app.schemas.session import (
    AnswerRequest,
    AnswerResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SessionHistoryResponse,
    SessionResponse,
)
from app.schemas.user import UserCreate, UserResponse
from app.schemas.face_analysis import (
    EmotionScores,
    FaceAnalysisRequest,
    FaceAnalysisResponse,
    FaceRegion,
    TensionAnalysis,
)

__all__ = [
    # Auth
    "AdminLoginRequest",
    "AdminLoginResponse",
    "RefreshTokenRequest",
    "SSOCallbackRequest",
    "TokenResponse",
    # Common
    "ErrorDetail",
    "ErrorResponse",
    "PaginatedResponse",
    # Evaluation
    "AptitudeScores",
    "EvaluationResponse",
    "EvaluationSummaryResponse",
    "JapaneseProficiencyScores",
    "LevelMismatch",
    "ScoreTrend",
    "WeakPointResponse",
    # Evaluation Config
    "ConfigHistoryListResponse",
    "ConfigHistoryResponse",
    "EvaluationConfigListResponse",
    "EvaluationConfigResponse",
    "EvaluationConfigUpdateRequest",
    # Question
    "QuestionBankCreate",
    "QuestionBankResponse",
    "QuestionBankUpdate",
    "QuestionListResponse",
    # Session
    "AnswerRequest",
    "AnswerResponse",
    "SessionCreateRequest",
    "SessionCreateResponse",
    "SessionHistoryResponse",
    "SessionResponse",
    # User
    "UserCreate",
    "UserResponse",
    # Face Analysis
    "EmotionScores",
    "FaceAnalysisRequest",
    "FaceAnalysisResponse",
    "FaceRegion",
    "TensionAnalysis",
]
