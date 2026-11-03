from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.rate_limit import ip_cliente, limiter
from app.core.security import (
    create_access_token,
    generar_token_email,
    get_password_hash,
    hash_token_email,
    verify_password,
)
from app.db.database import get_db
from app.models.ganaderia import EstadoInvitacion, GanaderiaUsuario, Invitacion, RolUsuario
from app.models.usuario import TipoTokenUsuario, TokenUsuario, Usuario
from app.schemas.ganaderia import InvitacionUsar
from app.schemas.usuario import (
    CambiarPasswordRequest,
    EmailRequest,
    LoginRequest,
    MensajeResponse,
    RestablecerPasswordRequest,
    TokenRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioRead,
)
from app.services.email import email_reset_password, email_verificacion, enviar_email

router = APIRouter(prefix="/auth", tags=["autenticación"])

# Respuesta idéntica exista o no la cuenta, para no revelar qué emails están registrados
MENSAJE_GENERICO_EMAIL = (
    "Si existe una cuenta con ese email, te hemos enviado un correo. "
    "Revisa también la carpeta de spam."
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def _buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(func.lower(Usuario.email) == email.strip().lower()).first()


def _emitir_token(usuario: Usuario) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(subject=usuario.id, version=usuario.token_version))


def _crear_token_email(db: Session, usuario: Usuario, tipo: TipoTokenUsuario, validez: timedelta) -> str:
    """Invalida los tokens pendientes del mismo tipo y crea uno nuevo. Devuelve el token en claro."""
    db.query(TokenUsuario).filter(
        TokenUsuario.usuario_id == usuario.id,
        TokenUsuario.tipo == tipo,
        TokenUsuario.usado_en.is_(None),
    ).update({TokenUsuario.usado_en: _ahora()}, synchronize_session=False)

    token, token_hash = generar_token_email()
    db.add(TokenUsuario(usuario_id=usuario.id, tipo=tipo, token_hash=token_hash, expira_en=_ahora() + validez))
    return token


def _consumir_token_email(db: Session, token: str, tipo: TipoTokenUsuario) -> Usuario:
    """Valida un token de un solo uso y lo marca como usado. Lanza 400 si no vale."""
    registro = db.query(TokenUsuario).filter_by(token_hash=hash_token_email(token), tipo=tipo).first()
    if not registro or registro.usado_en is not None or registro.expira_en < _ahora():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido o ha caducado. Solicita uno nuevo.",
        )
    registro.usado_en = _ahora()
    return registro.usuario


def _enviar_verificacion(db: Session, usuario: Usuario, tareas: BackgroundTasks) -> None:
    token = _crear_token_email(
        db, usuario, TipoTokenUsuario.verificacion_email, timedelta(hours=settings.VERIFICACION_EMAIL_HORAS)
    )
    tareas.add_task(enviar_email, *email_verificacion(usuario.email, usuario.nombre, token))


# ─── Registro y verificación ──────────────────────────────────────────────────

@router.post("/register", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def register(body: UsuarioCreate, request: Request, tareas: BackgroundTasks, db: Session = Depends(get_db)):
    """Registro abierto. La cuenta queda pendiente hasta que el usuario confirma su email."""
    limiter.check(f"register:ip:{ip_cliente(request)}", max_intentos=10, ventana_seg=3600)

    if _buscar_por_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese email. Si no la has confirmado, "
                   "puedes reenviar el correo desde la pantalla de inicio de sesión.",
        )
    usuario = Usuario(
        nombre=body.nombre,
        email=body.email.strip().lower(),
        hashed_password=get_password_hash(body.password),
    )
    db.add(usuario)
    db.flush()
    _enviar_verificacion(db, usuario, tareas)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/verificar-email", response_model=TokenResponse)
def verificar_email(body: TokenRequest, db: Session = Depends(get_db)):
    """Confirma el email con el token del enlace y devuelve directamente un JWT (inicia sesión)."""
    usuario = _consumir_token_email(db, body.token, TipoTokenUsuario.verificacion_email)
    usuario.email_verificado = True
    db.commit()
    return _emitir_token(usuario)


@router.post("/reenviar-verificacion", response_model=MensajeResponse, status_code=status.HTTP_202_ACCEPTED)
def reenviar_verificacion(body: EmailRequest, request: Request, tareas: BackgroundTasks, db: Session = Depends(get_db)):
    limiter.check(f"correo:ip:{ip_cliente(request)}", max_intentos=10, ventana_seg=3600)
    limiter.check(f"verificacion:email:{body.email.lower()}", max_intentos=3, ventana_seg=900)

    usuario = _buscar_por_email(db, body.email)
    if usuario and not usuario.email_verificado:
        _enviar_verificacion(db, usuario, tareas)
        db.commit()
    return MensajeResponse(message=MENSAJE_GENERICO_EMAIL)


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login con email y contraseña. Devuelve un JWT."""
    limiter.check(f"login:ip:{ip_cliente(request)}", max_intentos=20, ventana_seg=300)
    limiter.check(f"login:email:{body.email.lower()}", max_intentos=5, ventana_seg=300)

    usuario = _buscar_por_email(db, body.email)
    if not usuario or not verify_password(body.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Solo se informa de que falta verificar si la contraseña es correcta
    if not usuario.email_verificado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "codigo": "email_no_verificado",
                "mensaje": "Tienes que confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.",
            },
        )
    return _emitir_token(usuario)


@router.get("/me", response_model=UsuarioRead)
def me(current_user: Usuario = Depends(get_current_user)):
    """Devuelve los datos del usuario autenticado."""
    return current_user


# ─── Contraseñas ──────────────────────────────────────────────────────────────

@router.post("/olvide-password", response_model=MensajeResponse, status_code=status.HTTP_202_ACCEPTED)
def olvide_password(body: EmailRequest, request: Request, tareas: BackgroundTasks, db: Session = Depends(get_db)):
    """Envía un enlace para restablecer la contraseña (si la cuenta existe)."""
    limiter.check(f"correo:ip:{ip_cliente(request)}", max_intentos=10, ventana_seg=3600)
    limiter.check(f"reset:email:{body.email.lower()}", max_intentos=3, ventana_seg=900)

    usuario = _buscar_por_email(db, body.email)
    if usuario:
        token = _crear_token_email(
            db, usuario, TipoTokenUsuario.reset_password, timedelta(minutes=settings.RESET_PASSWORD_MINUTOS)
        )
        db.commit()
        tareas.add_task(enviar_email, *email_reset_password(usuario.email, usuario.nombre, token))
    return MensajeResponse(message=MENSAJE_GENERICO_EMAIL)


@router.post("/restablecer-password", response_model=MensajeResponse)
def restablecer_password(body: RestablecerPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Cambia la contraseña con el token del enlace y cierra todas las sesiones abiertas."""
    limiter.check(f"restablecer:ip:{ip_cliente(request)}", max_intentos=10, ventana_seg=900)

    usuario = _consumir_token_email(db, body.token, TipoTokenUsuario.reset_password)
    usuario.hashed_password = get_password_hash(body.password)
    usuario.token_version += 1
    # Ha demostrado que controla el correo
    usuario.email_verificado = True
    db.commit()
    return MensajeResponse(message="Contraseña actualizada. Ya puedes iniciar sesión.")


@router.post("/cambiar-password", response_model=TokenResponse)
def cambiar_password(
    body: CambiarPasswordRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cambia la contraseña del usuario autenticado. Cierra las sesiones de los demás
    dispositivos y devuelve un token nuevo para que este siga conectado.
    """
    limiter.check(f"cambiar:usuario:{current_user.id}", max_intentos=5, ventana_seg=900)

    if not verify_password(body.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta")
    current_user.hashed_password = get_password_hash(body.password_nueva)
    current_user.token_version += 1
    db.commit()
    return _emitir_token(current_user)


# ─── Invitaciones ─────────────────────────────────────────────────────────────

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
