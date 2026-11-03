"""tabla gastos (alimentación, veterinario, fincas, otros)

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-11-03

"""
from alembic import op
import sqlalchemy as sa

revision = "c9d0e1f2a3b4"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None

categoria = sa.Enum("alimentacion", "veterinario", "fincas", "otros", name="categoria_gasto")


def upgrade() -> None:
    op.create_table(
        "gastos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ganaderia_id", sa.Integer(), sa.ForeignKey("ganaderias.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("categoria", categoria, nullable=False),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("vendedor", sa.String(200), nullable=True),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("precio >= 0", name="ck_gasto_precio_positivo"),
    )
    op.create_index("ix_gastos_ganaderia_id", "gastos", ["ganaderia_id"])
    op.create_index("ix_gastos_fecha", "gastos", ["fecha"])
    op.create_index("ix_gastos_categoria", "gastos", ["categoria"])


def downgrade() -> None:
    op.drop_index("ix_gastos_categoria", table_name="gastos")
    op.drop_index("ix_gastos_fecha", table_name="gastos")
    op.drop_index("ix_gastos_ganaderia_id", table_name="gastos")
    op.drop_table("gastos")
    categoria.drop(op.get_bind(), checkfirst=True)
