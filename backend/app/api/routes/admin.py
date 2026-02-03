"""Admin endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.core.deps import CurrentAdmin, DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.schemas.auth import AdminInfo, AdminLoginRequest, AdminLoginResponse
from app.schemas.question import (
    QuestionBankCreate,
    QuestionBankResponse,
    QuestionBankUpdate,
    QuestionListResponse,
)
from app.services.admin_service import AdminService
from app.services.question_service import QuestionService

router = APIRouter()


# Authentication
@router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: DbSession,
) -> AdminLoginResponse:
    """Admin login endpoint."""
    admin_service = AdminService(db)

    admin = await admin_service.get_admin_by_email(request.email)
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled",
        )

    # Generate tokens with admin secret key
    token_data = {"sub": str(admin.id), "email": admin.email, "role": admin.role}
    access_token = create_access_token(
        token_data,
        secret_key=settings.admin_jwt_secret_key,
    )
    refresh_token = create_refresh_token(
        token_data,
        secret_key=settings.admin_jwt_secret_key,
    )

    return AdminLoginResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_token=refresh_token,
        admin=AdminInfo(
            id=str(admin.id),
            email=admin.email,
            name=admin.name,
            role=admin.role,
        ),
    )


# Question Management
@router.get("/questions", response_model=QuestionListResponse)
async def get_questions(
    db: DbSession,
    current_admin: CurrentAdmin,
    category: str | None = None,
    jlpt_level: str | None = Query(None, pattern=r"^N[1-5]$"),
    industry: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> QuestionListResponse:
    """Get questions with filters."""
    question_service = QuestionService(db)

    result = await question_service.get_questions(
        category=category,
        industry=industry,
        limit=limit,
        offset=offset,
    )
    return result


@router.post("/questions", response_model=QuestionBankResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    request: QuestionBankCreate,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> QuestionBankResponse:
    """Create a new question."""
    question_service = QuestionService(db)

    try:
        result = await question_service.create_question(request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/questions/{question_id}", response_model=QuestionBankResponse)
async def get_question(
    question_id: str,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> QuestionBankResponse:
    """Get a specific question."""
    question_service = QuestionService(db)

    result = await question_service.get_question(question_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    return result


@router.put("/questions/{question_id}", response_model=QuestionBankResponse)
async def update_question(
    question_id: str,
    request: QuestionBankUpdate,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> QuestionBankResponse:
    """Update a question (creates a new version)."""
    question_service = QuestionService(db)

    try:
        result = await question_service.update_question(question_id, request)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> None:
    """Soft delete a question."""
    question_service = QuestionService(db)

    success = await question_service.delete_question(question_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )


# User Management
@router.get("/users")
async def get_users(
    db: DbSession,
    current_admin: CurrentAdmin,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    """Get user list."""
    admin_service = AdminService(db)

    result = await admin_service.get_users(limit=limit, offset=offset)
    return result


# Session Management
@router.get("/sessions")
async def get_sessions(
    db: DbSession,
    current_admin: CurrentAdmin,
    user_id: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    """Get session list for admin."""
    admin_service = AdminService(db)

    result = await admin_service.get_sessions(
        user_id=user_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return result


# Statistics
@router.get("/statistics")
async def get_statistics(
    db: DbSession,
    current_admin: CurrentAdmin,
) -> dict:
    """Get platform statistics."""
    admin_service = AdminService(db)

    result = await admin_service.get_statistics()
    return result
