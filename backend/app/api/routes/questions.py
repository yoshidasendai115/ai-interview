"""Script and question endpoints for users."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.services.question_service import QuestionService

router = APIRouter()


@router.get("")
async def get_scripts(
    db: DbSession,
    current_user: CurrentUser,
    jlpt_level: str | None = Query(None, pattern=r"^N[1-5]$"),
    industry: str | None = None,
    job_type: str | None = None,
) -> dict:
    """Get available scripts filtered by criteria."""
    question_service = QuestionService(db)

    scripts = await question_service.get_scripts(
        jlpt_level=jlpt_level,
        industry=industry,
        job_type=job_type,
    )
    return {"scripts": scripts}


@router.get("/{script_id}")
async def get_script(
    script_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Get script details with questions."""
    question_service = QuestionService(db)

    script = await question_service.get_script_detail(script_id)
    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )
    return script
