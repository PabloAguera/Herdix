"""add fecha_alta and crotal_provisional to animales

Permite dar de alta un animal (p. ej. un nacimiento) con un crotal provisional
y sustituirlo por el oficial de la Consejería dentro de un plazo desde fecha_alta.

A los animales existentes se les pone fecha_alta = fecha_nacimiento, así los
nacidos hace menos del plazo aún pueden corregir el crotal y el resto queda
bloqueado como hasta ahora.

Revision ID: f6a1b2c3d4e5
Revises: e5f6a1b2c3d4
Create Date: 2026-10-15

"""
from alembic import op
import sqlalchemy as sa

revision = "f6a1b2c3d4e5"
down_revision = "e5f6a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("animales", sa.Column("fecha_alta", sa.Date(), nullable=True))
    op.add_column(
        "animales",
        sa.Column(
            "crotal_provisional",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.execute("UPDATE animales SET fecha_alta = fecha_nacimiento")


def downgrade() -> None:
    op.drop_column("animales", "crotal_provisional")
    op.drop_column("animales", "fecha_alta")
