"""Add evaluation_config and evaluation_config_history tables

Revision ID: 001_add_evaluation_config
Revises:
Create Date: 2026-02-07

"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_add_evaluation_config"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ============================================
# Default seed data
# ============================================

JLPT_CONFIG = {
    "weights": {
        "N1": {"vocabulary": 0.20, "grammar": 0.20, "content": 0.25, "honorifics": 0.35},
        "N2": {"vocabulary": 0.20, "grammar": 0.25, "content": 0.25, "honorifics": 0.30},
        "N3": {"vocabulary": 0.25, "grammar": 0.30, "content": 0.25, "honorifics": 0.20},
        "N4": {"vocabulary": 0.30, "grammar": 0.35, "content": 0.25, "honorifics": 0.10},
        "N5": {"vocabulary": 0.35, "grammar": 0.40, "content": 0.20, "honorifics": 0.05},
    },
    "settings": {
        "N1": {"speechRate": 1.0, "useSimplified": False, "followUpDepth": 3},
        "N2": {"speechRate": 1.0, "useSimplified": False, "followUpDepth": 2},
        "N3": {"speechRate": 0.75, "useSimplified": False, "followUpDepth": 2},
        "N4": {"speechRate": 0.5, "useSimplified": True, "followUpDepth": 1},
        "N5": {"speechRate": 0.5, "useSimplified": True, "followUpDepth": 1},
    },
    "estimationRanges": {"N1": 80, "N2": 70, "N3": 60, "N4": 50, "N5": 40},
}

SCORING_CONFIG = {
    "gradeThresholds": [
        {"grade": "S", "label": "優秀", "minScore": 90, "recommendation": "積極的に採用を推奨"},
        {"grade": "A", "label": "非常に良い", "minScore": 80, "recommendation": "採用を推奨"},
        {"grade": "B", "label": "良い", "minScore": 70, "recommendation": "採用を検討"},
        {"grade": "C", "label": "普通", "minScore": 60, "recommendation": "追加面接を推奨"},
        {"grade": "D", "label": "要改善", "minScore": 0, "recommendation": "現時点では採用非推奨"},
    ],
    "performanceGrades": {"excellentMin": 90, "goodMin": 80, "passMin": 70},
    "levelAdjustment": {"highThreshold": 70, "lowThreshold": 30, "dailyChallengeLimit": 3},
    "jobSuitability": {
        "basicService": {"requiredLevel": "N4", "minScore": 70},
        "generalWork": {"requiredLevel": "N3", "minScore": 70},
        "businessHonorifics": {"requiredLevel": "N2", "minScore": 70},
        "advancedWork": {"requiredLevel": "N1", "minScore": 70},
    },
}

WEAK_POINT_CONFIG = {
    "threshold": 70,
    "tagThreshold": 3,
    "resolutionCount": 3,
    "resolutionScore": 80,
    "priority": {
        "occurrenceMultiplier": 10,
        "recencyWindowDays": 30,
        "highThreshold": 50,
        "mediumThreshold": 25,
    },
}

SEED_DATA = [
    {
        "config_key": "jlpt_config",
        "config_value": json.dumps(JLPT_CONFIG),
        "description": "JLPTレベル別の重み・設定・推定レベル範囲",
        "version": 1,
    },
    {
        "config_key": "scoring_config",
        "config_value": json.dumps(SCORING_CONFIG),
        "description": "スコアグレード・パフォーマンス評価・レベル調整・業務適性",
        "version": 1,
    },
    {
        "config_key": "weak_point_config",
        "config_value": json.dumps(WEAK_POINT_CONFIG),
        "description": "弱点検出閾値・優先度計算パラメータ",
        "version": 1,
    },
]


def upgrade() -> None:
    # Create evaluation_config table
    op.create_table(
        "evaluation_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("config_key", sa.String(100), nullable=False),
        sa.Column("config_value", postgresql.JSONB(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("admins.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("config_key"),
    )
    op.create_index("ix_evaluation_config_config_key", "evaluation_config", ["config_key"])

    # Create evaluation_config_history table
    op.create_table(
        "evaluation_config_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "config_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("evaluation_config.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("config_key", sa.String(100), nullable=False),
        sa.Column("previous_value", postgresql.JSONB(), nullable=False),
        sa.Column("new_value", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "changed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("admins.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_evaluation_config_history_config_key",
        "evaluation_config_history",
        ["config_key"],
    )

    # Seed initial data
    evaluation_config = sa.table(
        "evaluation_config",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("config_key", sa.String),
        sa.column("config_value", postgresql.JSONB),
        sa.column("description", sa.Text),
        sa.column("version", sa.Integer),
    )

    import uuid

    for seed in SEED_DATA:
        op.execute(
            evaluation_config.insert().values(
                id=uuid.uuid4(),
                config_key=seed["config_key"],
                config_value=sa.text(f"'{seed['config_value']}'::jsonb"),
                description=seed["description"],
                version=seed["version"],
            )
        )


def downgrade() -> None:
    op.drop_table("evaluation_config_history")
    op.drop_table("evaluation_config")
