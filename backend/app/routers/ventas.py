from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_ganaderia_usuario
from app.db.database import get_db
from app.models.ganaderia import GanaderiaUsuario
from app.models.venta import VentaAnio
from app.schemas.venta import VentaRead

router = APIRouter(prefix="/ganaderias/{ganaderia_id}/ventas", tags=["ventas"])


@router.get("/", response_model=list[VentaRead])
def listar_ventas(
    ganaderia_id: int,
    anio: int | None = None,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    query = db.query(VentaAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio:
        query = query.filter_by(anio=anio)
    return query.order_by(VentaAnio.fecha_exacta.desc()).all()


@router.delete("/{venta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_venta(
    ganaderia_id: int,
    venta_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Elimina un registro de venta (no restaura el animal al censo)."""
    venta = db.query(VentaAnio).filter_by(id=venta_id, ganaderia_id=ganaderia_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    db.delete(venta)
    db.commit()
