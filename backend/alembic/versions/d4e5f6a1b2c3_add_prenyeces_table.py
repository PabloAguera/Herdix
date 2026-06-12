"""add prenyeces table

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-05-31

"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a1b2c3"
down_revision = "c3d4e5f6a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "prenyeces",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ganaderia_id", sa.Integer(), nullable=False),
        sa.Column("crotal_madre", sa.String(20), nullable=False),
        sa.Column("fecha_cubricion", sa.Date(), nullable=False),
        sa.Column("fecha_esperada_parto", sa.Date(), nullable=False),
        sa.Column("crotal_padre", sa.String(20), nullable=True),
        sa.Column("padre_desc", sa.String(300), nullable=True),
        sa.Column("padre_ext_raza", sa.String(100), nullable=True),
        sa.Column("confirmado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["ganaderia_id"], ["ganaderias.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_prenyeces_ganaderia_id", "prenyeces", ["ganaderia_id"])
    op.create_index("ix_prenyeces_crotal_madre", "prenyeces", ["crotal_madre"])
    op.create_index("ix_prenyeces_fecha_esperada_parto", "prenyeces", ["fecha_esperada_parto"])


def downgrade() -> None:
    op.drop_index("ix_prenyeces_fecha_esperada_parto", "prenyeces")
    op.drop_index("ix_prenyeces_crotal_madre", "prenyeces")
    op.drop_index("ix_prenyeces_ganaderia_id", "prenyeces")
    op.drop_table("prenyeces")
