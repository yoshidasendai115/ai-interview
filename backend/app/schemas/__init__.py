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
]
