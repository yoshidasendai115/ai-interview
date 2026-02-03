"""Session related schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    """Request body for creating a session."""

    script_id: str
    jlpt_level: str = Field(pattern=r"^N[1-5]$")


class HeyGenSession(BaseModel):
    """HeyGen session information."""

    session_token: str
    avatar_id: str


class ScriptInfo(BaseModel):
    """Script information in session response."""

    id: str
    title: str
    total_questions: int


class SessionCreateResponse(BaseModel):
    """Response for session creation."""

    session_id: str
    script: ScriptInfo
    heygen_session: HeyGenSession
    started_at: datetime


class QuestionInfo(BaseModel):
    """Question information in session response."""

    id: int
    text: str


class AnswerInfo(BaseModel):
    """Answer information in session response."""

    question_id: int
    question_text: str
    answer_text: str | None = None
    answered_at: datetime


class SessionResponse(BaseModel):
    """Response for session details."""

    session_id: str
    status: str
    current_question: int
    total_questions: int
    answers: list[AnswerInfo]
    started_at: datetime


class AnswerRequest(BaseModel):
    """Request body for submitting an answer."""

    question_id: int
    audio_data: str | None = Field(None, description="Base64 encoded audio data")
    transcript: str | None = None


class NextQuestion(BaseModel):
    """Next question information."""

    id: int
    text: str


class AnswerResponse(BaseModel):
    """Response for submitting an answer."""

    answer_id: str
    question_id: int
    transcript: str | None = None
    next_question: NextQuestion | None = None


class SessionCompleteResponse(BaseModel):
    """Response for completing a session."""

    session_id: str
    status: str = "completed"
    completed_at: datetime
    evaluation_id: str


class SessionHistoryItem(BaseModel):
    """Session history item."""

    session_id: str
    script_title: str
    total_score: int | None = None
    completed_at: datetime


class SessionHistoryResponse(BaseModel):
    """Response for session history."""

    sessions: list[SessionHistoryItem]
    total: int
    limit: int
    offset: int
