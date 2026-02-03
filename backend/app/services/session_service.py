"""Session service for interview session management."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.interview import InterviewSession, SessionAnswer
from app.models.question import Script
from app.schemas.session import (
    AnswerInfo,
    AnswerResponse,
    HeyGenSession,
    NextQuestion,
    ScriptInfo,
    SessionCompleteResponse,
    SessionCreateResponse,
    SessionHistoryItem,
    SessionHistoryResponse,
    SessionResponse,
)


class SessionService:
    """Service for interview session operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_session(
        self,
        user_id: str,
        script_id: str,
        jlpt_level: str,
    ) -> SessionCreateResponse:
        """Create a new interview session."""
        # Get script
        stmt = select(Script).where(
            Script.id == script_id,
            Script.is_active == True,
        ).options(selectinload(Script.questions))
        result = await self.db.execute(stmt)
        script = result.scalar_one_or_none()

        if script is None:
            raise ValueError("Script not found or inactive")

        # Create session
        now = datetime.now(timezone.utc)
        session = InterviewSession(
            user_id=UUID(user_id),
            script_id=script.id,
            status="in_progress",
            started_at=now,
            created_at=now,
        )

        # TODO: Initialize HeyGen session
        # heygen_session = await self._init_heygen_session()
        # session.heygen_session_id = heygen_session.session_id
        heygen_session_token = "heygen_mock_token"
        avatar_id = "wayne_asian_male"

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return SessionCreateResponse(
            session_id=str(session.id),
            script=ScriptInfo(
                id=str(script.id),
                title=script.title,
                total_questions=len(script.questions),
            ),
            heygen_session=HeyGenSession(
                session_token=heygen_session_token,
                avatar_id=avatar_id,
            ),
            started_at=session.started_at,
        )

    async def get_session(
        self,
        session_id: str,
        user_id: str,
    ) -> SessionResponse | None:
        """Get session details."""
        stmt = (
            select(InterviewSession)
            .where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user_id,
            )
            .options(
                selectinload(InterviewSession.script).selectinload(Script.questions),
                selectinload(InterviewSession.answers),
            )
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if session is None:
            return None

        answers = [
            AnswerInfo(
                question_id=answer.question_order,
                question_text="",  # Would need to join with questions
                answer_text=answer.transcript,
                answered_at=answer.answered_at,
            )
            for answer in session.answers
        ]

        return SessionResponse(
            session_id=str(session.id),
            status=session.status,
            current_question=len(session.answers) + 1,
            total_questions=len(session.script.questions),
            answers=answers,
            started_at=session.started_at,
        )

    async def submit_answer(
        self,
        session_id: str,
        user_id: str,
        question_id: int,
        audio_data: str | None,
        transcript: str | None,
    ) -> AnswerResponse:
        """Submit an answer for a question."""
        # Get session
        stmt = (
            select(InterviewSession)
            .where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user_id,
                InterviewSession.status == "in_progress",
            )
            .options(selectinload(InterviewSession.script).selectinload(Script.questions))
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if session is None:
            raise ValueError("Session not found or not in progress")

        # Get question
        questions = sorted(session.script.questions, key=lambda q: q.order_number)
        if question_id < 1 or question_id > len(questions):
            raise ValueError("Invalid question ID")

        question = questions[question_id - 1]

        # TODO: Upload audio to S3 and get URL
        audio_url = None
        if audio_data:
            # audio_url = await self._upload_audio(audio_data, session_id, question_id)
            pass

        # TODO: Transcribe audio if transcript not provided
        if not transcript and audio_data:
            # transcript = await self._transcribe_audio(audio_data)
            pass

        # Create answer
        now = datetime.now(timezone.utc)
        answer = SessionAnswer(
            session_id=session.id,
            question_id=question.id,
            question_order=question_id,
            audio_url=audio_url,
            transcript=transcript,
            skipped=not transcript and not audio_data,
            answered_at=now,
            created_at=now,
        )
        self.db.add(answer)
        await self.db.commit()
        await self.db.refresh(answer)

        # Determine next question
        next_question = None
        if question_id < len(questions):
            next_q = questions[question_id]
            next_question = NextQuestion(
                id=question_id + 1,
                text=next_q.question_text,
            )

        return AnswerResponse(
            answer_id=str(answer.id),
            question_id=question_id,
            transcript=transcript,
            next_question=next_question,
        )

    async def complete_session(
        self,
        session_id: str,
        user_id: str,
    ) -> SessionCompleteResponse:
        """Complete a session and trigger evaluation."""
        stmt = select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id,
            InterviewSession.status == "in_progress",
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if session is None:
            raise ValueError("Session not found or not in progress")

        # Update session status
        now = datetime.now(timezone.utc)
        session.status = "completed"
        session.completed_at = now
        if session.started_at:
            session.duration_seconds = int((now - session.started_at).total_seconds())

        await self.db.commit()
        await self.db.refresh(session)

        # TODO: Trigger evaluation asynchronously
        # evaluation_id = await self._trigger_evaluation(session)
        evaluation_id = "eval_placeholder"

        return SessionCompleteResponse(
            session_id=str(session.id),
            status="completed",
            completed_at=now,
            evaluation_id=evaluation_id,
        )

    async def get_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> SessionHistoryResponse:
        """Get session history for a user."""
        # Count total
        count_stmt = (
            select(func.count())
            .select_from(InterviewSession)
            .where(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "completed",
            )
        )
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get sessions
        stmt = (
            select(InterviewSession)
            .where(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "completed",
            )
            .options(
                selectinload(InterviewSession.script),
                selectinload(InterviewSession.evaluation),
            )
            .order_by(InterviewSession.completed_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        items = [
            SessionHistoryItem(
                session_id=str(session.id),
                script_title=session.script.title,
                total_score=session.evaluation.total_score if session.evaluation else None,
                completed_at=session.completed_at,
            )
            for session in sessions
            if session.completed_at is not None
        ]

        return SessionHistoryResponse(
            sessions=items,
            total=total,
            limit=limit,
            offset=offset,
        )
