import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_ganaderia_usuario, require_admin
from app.db.database import get_db
from app.models.usuario import Usuario
from app.models.ganaderia import Ganaderia, GanaderiaUsuario, Invitacion, RolUsuario, EstadoInvitacion
from app.schemas.ganaderia import GanaderiaCreate, GanaderiaRead, GanaderiaUpdate, InvitacionRead, MiembroRead

router = APIRouter(prefix="/ganaderias", tags=["ganaderías"])


@router.post("/", response_model=GanaderiaRead, status_code=status.HTTP_201_CREATED)
def crear_ganaderia(
    body: GanaderiaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea una nueva ganadería. El creador queda como admin automáticamente."""
    ganaderia = Ganaderia(nombre=body.nombre, tipo=body.tipo, created_by=current_user.id)
    db.add(ganaderia)
    db.flush()  # Para obtener el ID antes del commit

    # Añadir al creador como admin
    gu = GanaderiaUsuario(
        ganaderia_id=ganaderia.id,
        usuario_id=current_user.id,
        rol=RolUsuario.admin,
    )
    db.add(gu)
    db.commit()
    db.refresh(ganaderia)
    return ganaderia


@router.get("/", response_model=list[GanaderiaRead])
def listar_mis_ganaderias(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas las ganaderías a las que pertenece el usuario."""
    ganaderias = (
        db.query(Ganaderia)
        .join(GanaderiaUsuario, Ganaderia.id == GanaderiaUsuario.ganaderia_id)
        .filter(GanaderiaUsuario.usuario_id == current_user.id)
        .all()
    )
    return ganaderias


@router.patch("/{ganaderia_id}", response_model=GanaderiaRead)
def renombrar_ganaderia(
    ganaderia_id: int,
    body: GanaderiaUpdate,
    gu: GanaderiaUsuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cambia el nombre de la ganadería (solo admin)."""
    nombre = body.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    ganaderia = db.get(Ganaderia, ganaderia_id)
    if not ganaderia:
        raise HTTPException(status_code=404, detail="Ganadería no encontrada")
    ganaderia.nombre = nombre
    db.commit()
    db.refresh(ganaderia)
    return ganaderia


@router.get("/{ganaderia_id}", response_model=GanaderiaRead)
def obtener_ganaderia(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Devuelve los detalles de una ganadería."""
    return db.get(Ganaderia, ganaderia_id)


# ─── Gestión de invitaciones ───────────────────────────────────────────────

@router.post("/{ganaderia_id}/invitaciones", response_model=InvitacionRead)
def crear_invitacion(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(require_admin),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Solo el admin puede generar enlaces de invitación."""
    token = secrets.token_urlsafe(32)
    inv = Invitacion(
        ganaderia_id=ganaderia_id,
        token=token,
        estado=EstadoInvitacion.activa,
        creada_by=current_user.id,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/{ganaderia_id}/invitaciones", response_model=list[InvitacionRead])
def listar_invitaciones(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todas las invitaciones de la ganadería (solo admin)."""
    return db.query(Invitacion).filter_by(ganaderia_id=ganaderia_id).all()


@router.get("/{ganaderia_id}/usuarios", response_model=list[MiembroRead])
def listar_miembros(
    ganaderia_id: int,
    _gu: GanaderiaUsuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos los miembros de la ganadería con su rol (solo admin)."""
    rows = (
        db.query(GanaderiaUsuario, Usuario)
        .join(Usuario, GanaderiaUsuario.usuario_id == Usuario.id)
        .filter(GanaderiaUsuario.ganaderia_id == ganaderia_id)
        .all()
    )
    return [
        MiembroRead(
            usuario_id=u.id,
            nombre=u.nombre,
            email=u.email,
            rol=gu_row.rol,
            joined_at=gu_row.joined_at,
        )
        for gu_row, u in rows
    ]


@router.delete("/{ganaderia_id}/invitaciones/{inv_id}", status_code=status.HTTP_204_NO_CONTENT)
def revocar_invitacion(
    ganaderia_id: int,
    inv_id: int,
    gu: GanaderiaUsuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Revoca un enlace de invitación (solo admin)."""
    inv = db.query(Invitacion).filter_by(id=inv_id, ganaderia_id=ganaderia_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    inv.estado = EstadoInvitacion.revocada
    db.commit()


@router.delete("/{ganaderia_id}/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def expulsar_usuario(
    ganaderia_id: int,
    usuario_id: int,
    gu: GanaderiaUsuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Expulsa a un colaborador de la ganadería (solo admin)."""
    target = db.query(GanaderiaUsuario).filter_by(
        ganaderia_id=ganaderia_id, usuario_id=usuario_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en esta ganadería")
    if target.rol == RolUsuario.admin:
        raise HTTPException(status_code=403, detail="No puedes expulsar al administrador")
    db.delete(target)
    db.commit()
