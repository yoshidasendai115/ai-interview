"""Evaluation endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.evaluation import EvaluationResponse, EvaluationSummaryResponse
from app.services.evaluation_service import EvaluationService

router = APIRouter()


@router.get("/{session_id}", response_model=EvaluationResponse)
async def get_evaluation(
    session_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> EvaluationResponse:
    """Get evaluation results for a session."""
    evaluation_service = EvaluationService(db)

    result = await evaluation_service.get_evaluation(
        session_id=session_id,
        user_id=current_user["sub"],
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )
    return result


@router.get("/summary", response_model=EvaluationSummaryResponse)
async def get_evaluation_summary(
    db: DbSession,
    current_user: CurrentUser,
) -> EvaluationSummaryResponse:
    """Get evaluation summary for learning progress."""
    evaluation_service = EvaluationService(db)

    result = await evaluation_service.get_summary(user_id=current_user["sub"])
    return result
