"""add destino to ventas_anio

Revision ID: a1b2c3d4e5f6
Revises: 0c3ac4dd9a0e
Create Date: 2026-05-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0c3ac4dd9a0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear el tipo ENUM en PostgreSQL
    destino_venta = sa.Enum('carne', 'vida', name='destino_venta')
    destino_venta.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'ventas_anio',
        sa.Column(
            'destino',
            sa.Enum('carne', 'vida', name='destino_venta'),
            nullable=False,
            server_default='carne',
        )
    )


def downgrade() -> None:
    op.drop_column('ventas_anio', 'destino')
    sa.Enum(name='destino_venta').drop(op.get_bind(), checkfirst=True)
