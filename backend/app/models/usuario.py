from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # El usuario debe confirmar su email antes de poder iniciar sesión.
    email_verificado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Se incrementa al cambiar/restablecer la contraseña: invalida todos los JWT
    # emitidos antes (cierra la sesión en todos los dispositivos).
    token_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    ganaderias_creadas: Mapped[list["Ganaderia"]] = relationship(
        "Ganaderia", back_populates="creador", foreign_keys="Ganaderia.created_by"
    )
    ganaderia_usuarios: Mapped[list["GanaderiaUsuario"]] = relationship(
        "GanaderiaUsuario", back_populates="usuario"
    )
    invitaciones_creadas: Mapped[list["Invitacion"]] = relationship(
        "Invitacion", back_populates="creada_by_usuario"
    )

    def __repr__(self) -> str:
        return f"<Usuario id={self.id} email={self.email!r}>"


class TipoTokenUsuario(str, PyEnum):
    verificacion_email = "verificacion_email"
    reset_password = "reset_password"


class TokenUsuario(Base):
    """
    Tokens de un solo uso enviados por email (verificación de cuenta y
    restablecimiento de contraseña). Solo se guarda el hash SHA-256 del token:
    si alguien accede a la BD no puede usar los enlaces pendientes.
    """
    __tablename__ = "tokens_usuario"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo: Mapped[TipoTokenUsuario] = mapped_column(
        Enum(TipoTokenUsuario, name="tipo_token_usuario"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    usuario: Mapped["Usuario"] = relationship("Usuario")

    def __repr__(self) -> str:
        return f"<TokenUsuario id={self.id} usuario={self.usuario_id} tipo={self.tipo}>"
