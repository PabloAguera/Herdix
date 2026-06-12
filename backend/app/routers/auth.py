import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db.database import get_db
from app.models.usuario import Usuario
from app.models.ganaderia import GanaderiaUsuario, Invitacion, RolUsuario, EstadoInvitacion
from app.schemas.usuario import UsuarioCreate, UsuarioRead, TokenResponse, LoginRequest
from app.schemas.ganaderia import InvitacionUsar

router = APIRouter(prefix="/auth", tags=["autenticación"])


def _email_permitido(email: str) -> bool:
    """Comprueba si el email está en la lista blanca ALLOWED_EMAILS del entorno.
    Si la variable no está definida o está vacía, el registro está cerrado para todos."""
    import os
    lista = os.environ.get("ALLOWED_EMAILS", "")
    if not lista.strip():
        return False
    permitidos = {e.strip().lower() for e in lista.split(",") if e.strip()}
    return email.strip().lower() in permitidos


@router.post("/register", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def register(body: UsuarioCreate, db: Session = Depends(get_db)):
    """Registro de nuevo usuario (solo emails en lista blanca ALLOWED_EMAILS)."""
    if not _email_permitido(body.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El registro está restringido. Contacta con el administrador.",
        )
    if db.query(Usuario).filter_by(email=body.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese email",
        )
    usuario = Usuario(
        nombre=body.nombre,
        email=body.email,
        hashed_password=get_password_hash(body.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Login con email y contraseña. Devuelve un JWT."""
    usuario = db.query(Usuario).filter_by(email=body.email).first()
    if not usuario or not verify_password(body.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=usuario.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def me(current_user: Usuario = Depends(get_current_user)):
    """Devuelve los datos del usuario autenticado."""
    return current_user


@router.post("/invitacion/usar", response_model=dict)
def usar_invitacion(
    body: InvitacionUsar,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    El usuario autenticado usa un token de invitación para unirse a una ganadería.
    """
    inv = db.query(Invitacion).filter_by(token=body.token).first()
    if not inv or inv.estado != EstadoInvitacion.activa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no válida o revocada",
        )

    # Verificar que no pertenece ya a la ganadería
    ya_pertenece = db.query(GanaderiaUsuario).filter_by(
        ganaderia_id=inv.ganaderia_id, usuario_id=current_user.id
    ).first()
    if ya_pertenece:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya perteneces a esta ganadería",
        )

    gu = GanaderiaUsuario(
        ganaderia_id=inv.ganaderia_id,
        usuario_id=current_user.id,
        rol=RolUsuario.colaborador,
    )
    db.add(gu)
    db.commit()
    return {"message": f"Te has unido a la ganadería #{inv.ganaderia_id} como colaborador"}
