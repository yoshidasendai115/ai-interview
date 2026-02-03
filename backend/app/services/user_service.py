"""User service for user management."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


class UserService:
    """Service for user-related operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def validate_sso_token(self, token: str) -> dict[str, Any] | None:
        """
        Validate SSO token with mintoku work.

        In production, this would call mintoku work's token validation endpoint.
        For now, this is a placeholder that decodes the token locally.
        """
        # TODO: Implement actual SSO token validation with mintoku work
        # This is a placeholder implementation
        try:
            # In production: call mintoku work's userinfo endpoint
            # For development, we'll return mock data based on token
            # The token should be validated against mintoku work's public key

            # Placeholder: return None if token is invalid/empty
            if not token:
                return None

            # Mock user data for development
            return {
                "mintoku_user_id": "mintoku_dev_user",
                "email": "dev@example.com",
                "name": "Development User",
                "organization": "Test Organization",
                "jlpt_level": "N3",
            }
        except Exception:
            return None

    async def get_or_create_user(self, user_data: dict[str, Any]) -> User:
        """Get existing user or create a new one from SSO data."""
        # Try to find existing user
        stmt = select(User).where(User.mintoku_user_id == user_data["mintoku_user_id"])
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is not None:
            # Update user info from SSO
            user.email = user_data.get("email", user.email)
            user.name = user_data.get("name", user.name)
            user.organization = user_data.get("organization")
            user.jlpt_level = user_data.get("jlpt_level")
            await self.db.commit()
            await self.db.refresh(user)
            return user

        # Create new user
        user = User(
            mintoku_user_id=user_data["mintoku_user_id"],
            email=user_data["email"],
            name=user_data["name"],
            organization=user_data.get("organization"),
            jlpt_level=user_data.get("jlpt_level"),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_user_by_id(self, user_id: str) -> User | None:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_mintoku_id(self, mintoku_user_id: str) -> User | None:
        """Get user by mintoku user ID."""
        stmt = select(User).where(User.mintoku_user_id == mintoku_user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        user = User(
            mintoku_user_id=user_data.mintoku_user_id,
            email=user_data.email,
            name=user_data.name,
            organization=user_data.organization,
            jlpt_level=user_data.jlpt_level,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
