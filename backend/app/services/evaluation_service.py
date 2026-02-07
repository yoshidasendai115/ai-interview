"""Evaluation service for evaluation management."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.evaluation import AptitudeEvaluation, Evaluation, EvaluationDetail
from app.models.evaluation_config import EvaluationConfig
from app.models.interview import InterviewSession
from app.models.user import User, WeakPoint
from app.schemas.evaluation import (
    Aptitude,
    AptitudeFeedback,
    AptitudeScores,
    AptitudeSummary,
    EvaluationResponse,
    EvaluationSummaryResponse,
    JapaneseProficiency,
    JapaneseProficiencyFeedback,
    JapaneseProficiencyScores,
    LevelMismatch,
    ScoreTrend,
    WeakPointResponse,
    WeakPointSummary,
)

# Default grade thresholds (used as fallback when DB config is unavailable)
DEFAULT_GRADE_THRESHOLDS = [
    {"grade": "S", "label": "優秀", "minScore": 90, "recommendation": "積極的に採用を推奨"},
    {"grade": "A", "label": "非常に良い", "minScore": 80, "recommendation": "採用を推奨"},
    {"grade": "B", "label": "良い", "minScore": 70, "recommendation": "採用を検討"},
    {"grade": "C", "label": "普通", "minScore": 60, "recommendation": "追加面接を推奨"},
    {"grade": "D", "label": "要改善", "minScore": 0, "recommendation": "現時点では採用非推奨"},
]


class EvaluationService:
    """Service for evaluation operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_evaluation(
        self,
        session_id: str,
        user_id: str,
    ) -> EvaluationResponse | None:
        """Get evaluation results for a session."""
        # Verify session belongs to user
        session_stmt = select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id,
        )
        session_result = await self.db.execute(session_stmt)
        session = session_result.scalar_one_or_none()

        if session is None:
            return None

        # Get evaluation with details
        stmt = (
            select(Evaluation)
            .where(Evaluation.session_id == session_id)
            .options(
                selectinload(Evaluation.details),
                selectinload(Evaluation.aptitude_evaluations),
            )
        )
        result = await self.db.execute(stmt)
        evaluation = result.scalar_one_or_none()

        if evaluation is None:
            return None

        # Build Japanese proficiency response
        jp_scores = {d.category: d.score for d in evaluation.details}
        jp_feedback = {d.category: d.feedback or "" for d in evaluation.details}

        japanese_proficiency = JapaneseProficiency(
            score=sum(jp_scores.values()) // len(jp_scores) if jp_scores else 0,
            scores=JapaneseProficiencyScores(
                vocabulary=jp_scores.get("vocabulary", 0),
                grammar=jp_scores.get("grammar", 0),
                content=jp_scores.get("content", 0),
                honorifics=jp_scores.get("honorifics", 0),
            ),
            feedback=JapaneseProficiencyFeedback(
                vocabulary=jp_feedback.get("vocabulary", ""),
                grammar=jp_feedback.get("grammar", ""),
                content=jp_feedback.get("content", ""),
                honorifics=jp_feedback.get("honorifics", ""),
            ),
        )

        # Build aptitude response
        apt_scores = {a.category: float(a.score) for a in evaluation.aptitude_evaluations}
        apt_feedback = {a.category: a.feedback or "" for a in evaluation.aptitude_evaluations}

        aptitude = Aptitude(
            score=sum(apt_scores.values()) / len(apt_scores) if apt_scores else 0,
            scores=AptitudeScores(
                adaptability=apt_scores.get("adaptability", 1.0),
                communication=apt_scores.get("communication", 1.0),
                initiative=apt_scores.get("initiative", 1.0),
                retention=apt_scores.get("retention", 1.0),
                cooperation=apt_scores.get("cooperation", 1.0),
            ),
            feedback=AptitudeFeedback(
                adaptability=apt_feedback.get("adaptability", ""),
                communication=apt_feedback.get("communication", ""),
                initiative=apt_feedback.get("initiative", ""),
                retention=apt_feedback.get("retention", ""),
                cooperation=apt_feedback.get("cooperation", ""),
            ),
        )

        # Determine grade
        grade, grade_label, recommendation = await self._calculate_grade(evaluation.total_score)

        # Get weak points for user
        weak_points_stmt = (
            select(WeakPoint)
            .where(
                WeakPoint.user_id == user_id,
                WeakPoint.resolved == False,
            )
            .order_by(WeakPoint.priority.desc(), WeakPoint.occurrence_count.desc())
            .limit(5)
        )
        wp_result = await self.db.execute(weak_points_stmt)
        weak_points = [
            WeakPointResponse(
                category=wp.category,
                category_type="japanese_proficiency",  # TODO: Determine type
                description=wp.description,
                priority=wp.priority,
            )
            for wp in wp_result.scalars().all()
        ]

        return EvaluationResponse(
            evaluation_id=str(evaluation.id),
            session_id=str(evaluation.session_id),
            total_score=evaluation.total_score,
            grade=grade,
            grade_label=grade_label,
            recommendation=recommendation,
            japanese_proficiency=japanese_proficiency,
            aptitude=aptitude,
            overall_feedback=evaluation.overall_feedback or "",
            weak_points=weak_points,
            level_mismatch=None,  # TODO: Implement level mismatch detection
            evaluated_at=evaluation.evaluated_at,
        )

    async def _load_grade_thresholds(self) -> list[dict]:
        """Load grade thresholds from DB config, falling back to defaults."""
        stmt = select(EvaluationConfig).where(
            EvaluationConfig.config_key == "scoring_config"
        )
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if config is not None:
            config_value = config.config_value
            if isinstance(config_value, dict) and "gradeThresholds" in config_value:
                return config_value["gradeThresholds"]

        return DEFAULT_GRADE_THRESHOLDS

    async def _calculate_grade(self, total_score: int) -> tuple[str, str, str]:
        """Calculate grade from total score using DB-driven thresholds."""
        thresholds = await self._load_grade_thresholds()

        for entry in thresholds:
            if total_score >= entry["minScore"]:
                return entry["grade"], entry["label"], entry["recommendation"]

        # Fallback to last entry
        last = thresholds[-1]
        return last["grade"], last["label"], last["recommendation"]

    async def get_summary(self, user_id: str) -> EvaluationSummaryResponse:
        """Get evaluation summary for learning progress."""
        # Get user
        user_stmt = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        # Get completed sessions with evaluations
        sessions_stmt = (
            select(InterviewSession)
            .where(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "completed",
            )
            .options(
                selectinload(InterviewSession.evaluation).selectinload(Evaluation.details),
                selectinload(InterviewSession.evaluation).selectinload(
                    Evaluation.aptitude_evaluations
                ),
            )
            .order_by(InterviewSession.completed_at.desc())
        )
        sessions_result = await self.db.execute(sessions_stmt)
        sessions = list(sessions_result.scalars().all())

        total_sessions = len(sessions)

        # Calculate averages and trends
        total_scores: list[int] = []
        jp_scores: list[int] = []
        apt_scores: list[float] = []
        score_trend: list[ScoreTrend] = []

        apt_totals = {
            "adaptability": 0.0,
            "communication": 0.0,
            "initiative": 0.0,
            "retention": 0.0,
            "cooperation": 0.0,
        }

        for session in sessions[:10]:  # Last 10 for trend
            if session.evaluation:
                total_scores.append(session.evaluation.total_score)

                # Calculate JP score
                jp_score = 0
                if session.evaluation.details:
                    jp_score = sum(d.score for d in session.evaluation.details) // len(
                        session.evaluation.details
                    )
                jp_scores.append(jp_score)

                # Calculate aptitude score
                apt_score = 0.0
                if session.evaluation.aptitude_evaluations:
                    apt_score = sum(
                        float(a.score) for a in session.evaluation.aptitude_evaluations
                    ) / len(session.evaluation.aptitude_evaluations)
                    for a in session.evaluation.aptitude_evaluations:
                        if a.category in apt_totals:
                            apt_totals[a.category] += float(a.score)
                apt_scores.append(apt_score)

                if session.completed_at:
                    score_trend.append(
                        ScoreTrend(
                            date=session.completed_at.strftime("%Y-%m-%d"),
                            total_score=session.evaluation.total_score,
                            japanese_proficiency=jp_score,
                            aptitude=apt_score,
                        )
                    )

        # Reverse trend to be chronological
        score_trend.reverse()

        # Calculate averages
        avg_total = sum(total_scores) // len(total_scores) if total_scores else 0
        avg_jp = sum(jp_scores) // len(jp_scores) if jp_scores else 0
        avg_apt = sum(apt_scores) / len(apt_scores) if apt_scores else 0.0

        # Calculate aptitude averages
        n = len(apt_scores) or 1
        avg_apt_scores = AptitudeScores(
            adaptability=round(apt_totals["adaptability"] / n, 1),
            communication=round(apt_totals["communication"] / n, 1),
            initiative=round(apt_totals["initiative"] / n, 1),
            retention=round(apt_totals["retention"] / n, 1),
            cooperation=round(apt_totals["cooperation"] / n, 1),
        )

        # Find strongest and weakest
        apt_dict = apt_totals
        strongest = max(apt_dict, key=lambda k: apt_dict[k])
        weakest = min(apt_dict, key=lambda k: apt_dict[k])

        # Get weak points summary
        wp_stmt = (
            select(
                WeakPoint.category,
                func.count(WeakPoint.id).label("frequency"),
                WeakPoint.priority,
            )
            .where(
                WeakPoint.user_id == user_id,
                WeakPoint.resolved == False,
            )
            .group_by(WeakPoint.category, WeakPoint.priority)
            .order_by(func.count(WeakPoint.id).desc())
            .limit(5)
        )
        wp_result = await self.db.execute(wp_stmt)
        weak_points_summary = [
            WeakPointSummary(
                category=row.category,
                category_type="japanese_proficiency",
                label=row.category,  # TODO: Map to Japanese label
                frequency=row.frequency,
                priority=row.priority,
            )
            for row in wp_result.all()
        ]

        # Calculate practice time
        practice_time = sum(s.duration_seconds or 0 for s in sessions) // 60

        return EvaluationSummaryResponse(
            user_id=user_id,
            total_sessions=total_sessions,
            average_total_score=avg_total,
            average_japanese_proficiency_score=avg_jp,
            average_aptitude_score=round(avg_apt, 1),
            score_trend=score_trend,
            weak_points_summary=weak_points_summary,
            aptitude_summary=AptitudeSummary(
                average_scores=avg_apt_scores,
                strongest=strongest,
                weakest=weakest,
            ),
            practice_time_minutes=practice_time,
            jlpt_level=user.jlpt_level if user else None,
        )
