"""Admin service for administrative operations."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.admin import Admin
from app.models.evaluation import Evaluation
from app.models.interview import InterviewSession
from app.models.user import User


class AdminService:
    """Service for admin operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_admin_by_email(self, email: str) -> Admin | None:
        """Get admin by email."""
        stmt = select(Admin).where(Admin.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Get user list for admin."""
        # Count total
        count_stmt = select(func.count()).select_from(User)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get users
        stmt = (
            select(User)
            .order_by(User.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        users = result.scalars().all()

        return {
            "users": [
                {
                    "id": str(user.id),
                    "mintoku_user_id": user.mintoku_user_id,
                    "email": user.email,
                    "name": user.name,
                    "organization": user.organization,
                    "jlpt_level": user.jlpt_level,
                    "created_at": user.created_at.isoformat(),
                }
                for user in users
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    async def get_sessions(
        self,
        user_id: str | None = None,
        status_filter: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Get session list for admin."""
        # Build query
        stmt = select(InterviewSession)

        if user_id:
            stmt = stmt.where(InterviewSession.user_id == user_id)
        if status_filter:
            stmt = stmt.where(InterviewSession.status == status_filter)

        # Count total
        count_stmt = select(func.count()).select_from(InterviewSession)
        if user_id:
            count_stmt = count_stmt.where(InterviewSession.user_id == user_id)
        if status_filter:
            count_stmt = count_stmt.where(InterviewSession.status == status_filter)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get sessions with relationships
        stmt = (
            stmt.options(
                selectinload(InterviewSession.user),
                selectinload(InterviewSession.script),
                selectinload(InterviewSession.evaluation),
            )
            .order_by(InterviewSession.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        return {
            "sessions": [
                {
                    "id": str(session.id),
                    "user": {
                        "id": str(session.user.id),
                        "name": session.user.name,
                        "email": session.user.email,
                    },
                    "script_title": session.script.title,
                    "status": session.status,
                    "total_score": session.evaluation.total_score if session.evaluation else None,
                    "started_at": session.started_at.isoformat() if session.started_at else None,
                    "completed_at": session.completed_at.isoformat()
                    if session.completed_at
                    else None,
                    "duration_seconds": session.duration_seconds,
                }
                for session in sessions
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    async def get_statistics(self) -> dict[str, Any]:
        """Get platform statistics."""
        # Total users
        user_count_stmt = select(func.count()).select_from(User)
        user_count_result = await self.db.execute(user_count_stmt)
        total_users = user_count_result.scalar() or 0

        # Total sessions
        session_count_stmt = select(func.count()).select_from(InterviewSession)
        session_count_result = await self.db.execute(session_count_stmt)
        total_sessions = session_count_result.scalar() or 0

        # Completed sessions
        completed_stmt = (
            select(func.count())
            .select_from(InterviewSession)
            .where(InterviewSession.status == "completed")
        )
        completed_result = await self.db.execute(completed_stmt)
        completed_sessions = completed_result.scalar() or 0

        # Average score
        avg_score_stmt = select(func.avg(Evaluation.total_score)).select_from(Evaluation)
        avg_score_result = await self.db.execute(avg_score_stmt)
        avg_score = avg_score_result.scalar() or 0

        # Sessions today
        from datetime import datetime, timezone

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_stmt = (
            select(func.count())
            .select_from(InterviewSession)
            .where(InterviewSession.created_at >= today_start)
        )
        today_result = await self.db.execute(today_stmt)
        sessions_today = today_result.scalar() or 0

        return {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "completion_rate": round(completed_sessions / total_sessions * 100, 1)
            if total_sessions > 0
            else 0,
            "average_score": round(float(avg_score), 1),
            "sessions_today": sessions_today,
        }
