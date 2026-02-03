"""Interview session endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.session import (
    AnswerRequest,
    AnswerResponse,
    SessionCompleteResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SessionHistoryResponse,
    SessionResponse,
)
from app.services.session_service import SessionService

router = APIRouter()


@router.post("", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SessionCreateResponse:
    """
    Start a new interview session.

    Creates a new session with the specified script and initializes HeyGen.
    """
    session_service = SessionService(db)

    try:
        result = await session_service.create_session(
            user_id=current_user["sub"],
            script_id=request.script_id,
            jlpt_level=request.jlpt_level,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> SessionResponse:
    """Get session details."""
    session_service = SessionService(db)

    result = await session_service.get_session(
        session_id=session_id,
        user_id=current_user["sub"],
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return result


@router.post("/{session_id}/answers", response_model=AnswerResponse)
async def submit_answer(
    session_id: str,
    request: AnswerRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> AnswerResponse:
    """Submit an answer for a question."""
    session_service = SessionService(db)

    try:
        result = await session_service.submit_answer(
            session_id=session_id,
            user_id=current_user["sub"],
            question_id=request.question_id,
            audio_data=request.audio_data,
            transcript=request.transcript,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{session_id}/complete", response_model=SessionCompleteResponse)
async def complete_session(
    session_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> SessionCompleteResponse:
    """Complete a session and trigger evaluation."""
    session_service = SessionService(db)

    try:
        result = await session_service.complete_session(
            session_id=session_id,
            user_id=current_user["sub"],
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/history", response_model=SessionHistoryResponse)
async def get_session_history(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> SessionHistoryResponse:
    """Get session history for the current user."""
    session_service = SessionService(db)

    result = await session_service.get_history(
        user_id=current_user["sub"],
        limit=limit,
        offset=offset,
    )
    return result
