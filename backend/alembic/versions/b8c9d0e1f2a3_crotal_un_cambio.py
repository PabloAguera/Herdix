"""crotal: un cambio por animal sin plazo (sustituye el plazo de 60 días)

Antes el crotal se podía cambiar durante 60 días desde el alta (fecha_alta).
Ahora cada animal admite un cambio sin plazo y el admin puede corregirlo
siempre. Todos los animales existentes empiezan con su cambio disponible.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-11-03

"""
from alembic import op
import sqlalchemy as sa

revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "animales",
        sa.Column("crotal_cambiado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("animales", "crotal_cambiado")
