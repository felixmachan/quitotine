"""add diary entries

Revision ID: 0002_add_diary_entries
Revises: 0001_initial
Create Date: 2026-02-07 00:00:00
"""
from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg


# revision identifiers, used by Alembic.
revision = "0002_add_diary_entries"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "diary_entries",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("program_id", pg.UUID(as_uuid=True), sa.ForeignKey("programs.id"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("mood", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("program_id", "entry_date", name="uq_diary_program_date"),
    )
    op.create_index("ix_diary_entries_program_id", "diary_entries", ["program_id"])
    op.create_index("ix_diary_entries_entry_date", "diary_entries", ["entry_date"])


def downgrade() -> None:
    op.drop_index("ix_diary_entries_entry_date", table_name="diary_entries")
    op.drop_index("ix_diary_entries_program_id", table_name="diary_entries")
    op.drop_table("diary_entries")
