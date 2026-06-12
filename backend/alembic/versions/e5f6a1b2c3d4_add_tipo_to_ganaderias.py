"""add tipo to ganaderias

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-05-31

"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a1b2c3d4"
down_revision = "d4e5f6a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear el tipo enum primero
    tipo_enum = sa.Enum("bovino", "equino", name="tipo_ganaderia")
    tipo_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "ganaderias",
        sa.Column(
            "tipo",
            sa.Enum("bovino", "equino", name="tipo_ganaderia"),
            nullable=False,
            server_default="bovino",
        ),
    )


def downgrade() -> None:
    op.drop_column("ganaderias", "tipo")
    sa.Enum(name="tipo_ganaderia").drop(op.get_bind(), checkfirst=True)
