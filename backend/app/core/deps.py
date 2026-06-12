from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.usuario import Usuario
from app.models.ganaderia import GanaderiaUsuario, RolUsuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    """Extrae el usuario autenticado a partir del JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    usuario = db.get(Usuario, int(user_id))
    if usuario is None:
        raise credentials_exception

    return usuario


def get_ganaderia_usuario(
    ganaderia_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GanaderiaUsuario:
    """Verifica que el usuario pertenece a la ganadería."""
    gu = (
        db.query(GanaderiaUsuario)
        .filter_by(ganaderia_id=ganaderia_id, usuario_id=current_user.id)
        .first()
    )
    if not gu:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta ganadería",
        )
    return gu


def require_admin(
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
) -> GanaderiaUsuario:
    """Verifica que el usuario es admin de la ganadería."""
    if gu.rol != RolUsuario.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return gu
