"""add compras_anio table

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-05-29

"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a1b2"
down_revision = "b2c3d4e5f6a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compras_anio",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("anio", sa.Integer(), nullable=False),
        sa.Column("fecha_exacta", sa.Date(), nullable=True),
        sa.Column("crotal_animal", sa.String(20), nullable=False),
        sa.Column("ganaderia_id", sa.Integer(), nullable=False),
        sa.Column("vendedor", sa.String(200), nullable=True),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["ganaderia_id"], ["ganaderias.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("anio >= 2000 AND anio <= 2100", name="ck_compra_anio_rango"),
    )
    op.create_index("ix_compras_anio_anio", "compras_anio", ["anio"])
    op.create_index("ix_compras_anio_crotal_animal", "compras_anio", ["crotal_animal"])
    op.create_index("ix_compras_anio_ganaderia_id", "compras_anio", ["ganaderia_id"])


def downgrade() -> None:
    op.drop_index("ix_compras_anio_ganaderia_id", "compras_anio")
    op.drop_index("ix_compras_anio_crotal_animal", "compras_anio")
    op.drop_index("ix_compras_anio_anio", "compras_anio")
    op.drop_table("compras_anio")
