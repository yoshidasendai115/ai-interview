"""Question service for question and script management."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.question import QuestionBank, QuestionCategory, Script, ScriptQuestion
from app.schemas.question import (
    QuestionBankCreate,
    QuestionBankResponse,
    QuestionBankUpdate,
    QuestionListResponse,
)


class QuestionService:
    """Service for question and script operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_questions(
        self,
        category: str | None = None,
        industry: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> QuestionListResponse:
        """Get questions with filters."""
        # Build base query
        stmt = select(QuestionBank).where(QuestionBank.is_deleted == False)

        if category:
            stmt = stmt.where(QuestionBank.category_id == category)

        # Count total
        count_stmt = (
            select(func.count())
            .select_from(QuestionBank)
            .where(QuestionBank.is_deleted == False)
        )
        if category:
            count_stmt = count_stmt.where(QuestionBank.category_id == category)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get questions
        stmt = stmt.order_by(QuestionBank.category_id, QuestionBank.id).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        questions = result.scalars().all()

        return QuestionListResponse(
            questions=[QuestionBankResponse.model_validate(q) for q in questions],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_question(self, question_id: str) -> QuestionBankResponse | None:
        """Get a specific question."""
        stmt = select(QuestionBank).where(
            QuestionBank.id == question_id,
            QuestionBank.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()

        if question is None:
            return None

        return QuestionBankResponse.model_validate(question)

    async def create_question(self, data: QuestionBankCreate) -> QuestionBankResponse:
        """Create a new question."""
        # Verify category exists
        cat_stmt = select(QuestionCategory).where(QuestionCategory.id == data.category_id)
        cat_result = await self.db.execute(cat_stmt)
        if cat_result.scalar_one_or_none() is None:
            raise ValueError(f"Category '{data.category_id}' not found")

        # Generate new question ID
        max_id_stmt = select(func.max(QuestionBank.id)).where(
            QuestionBank.id.like("Q%")
        )
        max_result = await self.db.execute(max_id_stmt)
        max_id = max_result.scalar()

        if max_id:
            num = int(max_id[1:]) + 1
        else:
            num = 1
        new_id = f"Q{num:02d}"

        question = QuestionBank(
            id=new_id,
            category_id=data.category_id,
            question_ja=data.question_ja,
            question_simplified=data.question_simplified,
            question_reading=data.question_reading,
            difficulty=data.difficulty,
            industries=data.industries,
            evaluation_points=data.evaluation_points,
            follow_ups=data.follow_ups,
            good_answer_indicators=data.good_answer_indicators,
            red_flags=data.red_flags,
            is_ice_breaker=data.is_ice_breaker,
            is_condition_check=data.is_condition_check,
            is_closing_statement=data.is_closing_statement,
            source=data.source,
            version=1,
        )
        self.db.add(question)
        await self.db.commit()
        await self.db.refresh(question)

        return QuestionBankResponse.model_validate(question)

    async def update_question(
        self,
        question_id: str,
        data: QuestionBankUpdate,
    ) -> QuestionBankResponse | None:
        """Update a question (creates a new version)."""
        # Get existing question
        stmt = select(QuestionBank).where(
            QuestionBank.id == question_id,
            QuestionBank.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()

        if question is None:
            return None

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(question, field, value)

        question.version += 1
        question.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(question)

        return QuestionBankResponse.model_validate(question)

    async def delete_question(self, question_id: str) -> bool:
        """Soft delete a question."""
        stmt = select(QuestionBank).where(
            QuestionBank.id == question_id,
            QuestionBank.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()

        if question is None:
            return False

        question.is_deleted = True
        question.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()

        return True

    async def get_scripts(
        self,
        jlpt_level: str | None = None,
        industry: str | None = None,
        job_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get available scripts."""
        stmt = select(Script).where(Script.is_active == True)

        if jlpt_level:
            stmt = stmt.where(Script.jlpt_level == jlpt_level)
        if industry:
            stmt = stmt.where(Script.industry == industry)
        if job_type:
            stmt = stmt.where(Script.job_type == job_type)

        stmt = stmt.options(selectinload(Script.questions))

        result = await self.db.execute(stmt)
        scripts = result.scalars().all()

        return [
            {
                "id": str(script.id),
                "title": script.title,
                "industry": script.industry,
                "job_type": script.job_type,
                "jlpt_level": script.jlpt_level,
                "question_count": len(script.questions),
                "estimated_duration_minutes": script.estimated_duration_minutes,
            }
            for script in scripts
        ]

    async def get_script_detail(self, script_id: str) -> dict[str, Any] | None:
        """Get script details with questions."""
        stmt = (
            select(Script)
            .where(Script.id == script_id, Script.is_active == True)
            .options(selectinload(Script.questions))
        )
        result = await self.db.execute(stmt)
        script = result.scalar_one_or_none()

        if script is None:
            return None

        questions = sorted(script.questions, key=lambda q: q.order_number)

        return {
            "id": str(script.id),
            "title": script.title,
            "industry": script.industry,
            "job_type": script.job_type,
            "jlpt_level": script.jlpt_level,
            "questions": [
                {
                    "id": q.order_number,
                    "order": q.order_number,
                    "text": q.question_text,
                    "expected_duration_seconds": q.expected_duration_seconds,
                    "evaluation_criteria": list(q.evaluation_criteria.keys())
                    if q.evaluation_criteria
                    else [],
                }
                for q in questions
                if not q.is_deleted
            ],
        }
