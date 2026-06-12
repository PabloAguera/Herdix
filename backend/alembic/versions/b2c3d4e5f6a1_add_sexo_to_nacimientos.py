"""add sexo to nacimientos_anio

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-29 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reutilizar el tipo sexo_animal ya existente en PostgreSQL
    op.add_column(
        'nacimientos_anio',
        sa.Column(
            'sexo',
            postgresql.ENUM('macho', 'hembra', name='sexo_animal', create_type=False),
            nullable=True,
        )
    )


def downgrade() -> None:
    op.drop_column('nacimientos_anio', 'sexo')
