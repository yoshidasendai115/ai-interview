"""Authentication endpoints."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.schemas.auth import (
    RefreshTokenRequest,
    SSOCallbackRequest,
    SSOLoginResponse,
    TokenResponse,
    UserInfo,
)
from app.services.user_service import UserService

router = APIRouter()


@router.post("/sso/callback", response_model=SSOLoginResponse)
async def sso_callback(
    request: SSOCallbackRequest,
    db: DbSession,
) -> SSOLoginResponse:
    """
    Handle SSO callback from mintoku work.

    Validates the SSO token and creates/retrieves the user.
    """
    user_service = UserService(db)

    # Validate SSO token and get user info
    # In production, this would validate with mintoku work's token endpoint
    user_data = await user_service.validate_sso_token(request.token)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO token",
        )

    # Get or create user
    user = await user_service.get_or_create_user(user_data)

    # Generate tokens
    token_data = {"sub": str(user.id), "mintoku_user_id": user.mintoku_user_id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return SSOLoginResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_token=refresh_token,
        user=UserInfo(
            id=str(user.id),
            mintoku_user_id=user.mintoku_user_id,
            email=user.email,
            name=user.name,
            organization=user.organization,
            jlpt_level=user.jlpt_level,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest) -> TokenResponse:
    """Refresh access token using refresh token."""
    payload = verify_token(request.refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Generate new tokens
    token_data = {
        "sub": payload.get("sub"),
        "mintoku_user_id": payload.get("mintoku_user_id"),
    }
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_token=new_refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    """
    Logout endpoint.

    In a production environment, this would invalidate the token
    by adding it to a blacklist in Redis.
    """
    # Token invalidation would be implemented here
    return None
