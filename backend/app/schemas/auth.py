"""Authentication related schemas."""

from pydantic import BaseModel, EmailStr, Field


class SSOCallbackRequest(BaseModel):
    """Request body for SSO callback."""

    token: str = Field(description="SSO token from mintoku work")


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh."""

    refresh_token: str = Field(description="Refresh token")


class TokenResponse(BaseModel):
    """Token response for authentication."""

    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: str


class UserInfo(BaseModel):
    """User information in token response."""

    id: str
    mintoku_user_id: str
    email: str
    name: str
    organization: str | None = None
    jlpt_level: str | None = None


class SSOLoginResponse(TokenResponse):
    """Response for SSO login."""

    user: UserInfo


class AdminLoginRequest(BaseModel):
    """Request body for admin login."""

    email: EmailStr
    password: str = Field(min_length=8)


class AdminInfo(BaseModel):
    """Admin information in login response."""

    id: str
    email: str
    name: str
    role: str


class AdminLoginResponse(TokenResponse):
    """Response for admin login."""

    admin: AdminInfo
