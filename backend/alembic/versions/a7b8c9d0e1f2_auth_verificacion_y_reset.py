"""verificación de email, token_version y tabla tokens_usuario

Sustituye la lista blanca ALLOWED_EMAILS por registro abierto con verificación
de email, y añade recuperación de contraseña.

Los usuarios que ya existían se marcan como verificados para que puedan seguir
entrando sin tener que confirmar nada.

Revision ID: a7b8c9d0e1f2
Revises: f6a1b2c3d4e5
Create Date: 2026-11-03

"""
from alembic import op
import sqlalchemy as sa

revision = "a7b8c9d0e1f2"
down_revision = "f6a1b2c3d4e5"
branch_labels = None
depends_on = None

tipo_token = sa.Enum("verificacion_email", "reset_password", name="tipo_token_usuario")


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("email_verificado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "usuarios",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    # Usuarios existentes: ya estaban autorizados por la lista blanca
    op.execute("UPDATE usuarios SET email_verificado = true")

    op.create_table(
        "tokens_usuario",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", tipo_token, nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tokens_usuario_usuario_id", "tokens_usuario", ["usuario_id"])
    op.create_index("ix_tokens_usuario_token_hash", "tokens_usuario", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_tokens_usuario_token_hash", table_name="tokens_usuario")
    op.drop_index("ix_tokens_usuario_usuario_id", table_name="tokens_usuario")
    op.drop_table("tokens_usuario")
    tipo_token.drop(op.get_bind(), checkfirst=True)
    op.drop_column("usuarios", "token_version")
    op.drop_column("usuarios", "email_verificado")
