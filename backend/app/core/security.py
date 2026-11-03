import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Contexto de hashing de contraseñas (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con el hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash bcrypt de una contraseña."""
    return pwd_context.hash(password)


def create_access_token(
    subject: Any, expires_delta: timedelta | None = None, version: int = 0
) -> str:
    """
    Crea un JWT de acceso.
    - subject: normalmente el ID de usuario
    - expires_delta: tiempo de vida del token (por defecto ACCESS_TOKEN_EXPIRE_MINUTES)
    - version: token_version del usuario; si cambia (cambio de contraseña), el token deja de valer
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject), "ver": version}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """
    Decodifica y valida un JWT.
    Devuelve el payload si es válido, None si no.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ─── Tokens de un solo uso para enlaces por email ─────────────────────────────

def generar_token_email() -> tuple[str, str]:
    """Devuelve (token_en_claro, hash_sha256). El token en claro solo viaja en el email."""
    token = secrets.token_urlsafe(32)
    return token, hash_token_email(token)


def hash_token_email(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
