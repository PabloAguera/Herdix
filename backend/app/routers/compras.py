from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_ganaderia_usuario
from app.db.database import get_db
from app.models.ganaderia import GanaderiaUsuario
from app.models.compra import CompraAnio
from app.schemas.compra import CompraCreate, CompraRead

router = APIRouter(prefix="/ganaderias/{ganaderia_id}/compras", tags=["compras"])


@router.get("/", response_model=list[CompraRead])
def listar_compras(
    ganaderia_id: int,
    anio: int | None = None,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    query = db.query(CompraAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio:
        query = query.filter_by(anio=anio)
    return query.order_by(CompraAnio.fecha_exacta.desc()).all()


@router.post("/", response_model=CompraRead, status_code=status.HTTP_201_CREATED)
def registrar_compra(
    ganaderia_id: int,
    body: CompraCreate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    compra = CompraAnio(**body.model_dump())
    db.add(compra)
    db.commit()
    db.refresh(compra)
    return compra


@router.delete("/{compra_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_compra(
    ganaderia_id: int,
    compra_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    compra = db.query(CompraAnio).filter_by(id=compra_id, ganaderia_id=ganaderia_id).first()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    db.delete(compra)
    db.commit()
