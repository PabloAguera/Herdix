import calendar
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_ganaderia_usuario
from app.db.database import get_db
from app.models.ganaderia import Ganaderia, GanaderiaUsuario
from app.models.reproduccion import Prenez
from app.schemas.reproduccion import PrenezCreate, PrenezRead, PrenezUpdate

# Períodos de gestación por tipo de ganadería
GESTACION_POR_TIPO: dict[str, int] = {
    "bovino": 9,
    "equino": 11,
}


def gestacion_meses(ganaderia_id: int, db: Session) -> int:
    g = db.get(Ganaderia, ganaderia_id)
    tipo = g.tipo.value if g else "bovino"
    return GESTACION_POR_TIPO.get(tipo, 9)


def sumar_meses(d: date, meses: int) -> date:
    """Suma N meses a una fecha, ajustando el día si el mes destino tiene menos días."""
    mes = d.month + meses
    anio = d.year + (mes - 1) // 12
    mes = (mes - 1) % 12 + 1
    dia = min(d.day, calendar.monthrange(anio, mes)[1])
    return d.replace(year=anio, month=mes, day=dia)

router = APIRouter(
    prefix="/ganaderias/{ganaderia_id}/reproduccion",
    tags=["reproduccion"],
)


@router.get("/", response_model=list[PrenezRead])
def listar_prenyeces(
    ganaderia_id: int,
    todas: bool = False,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Lista preñeces activas ordenadas por proximidad de parto.
    Con ?todas=true incluye también las ya confirmadas."""
    query = db.query(Prenez).filter_by(ganaderia_id=ganaderia_id)
    if not todas:
        query = query.filter_by(confirmado=False)
    return query.order_by(Prenez.fecha_esperada_parto.asc()).all()


@router.post("/", response_model=PrenezRead, status_code=status.HTTP_201_CREATED)
def registrar_prenez(
    ganaderia_id: int,
    body: PrenezCreate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    fecha_esperada = sumar_meses(body.fecha_cubricion, gestacion_meses(ganaderia_id, db))
    prenez = Prenez(
        **body.model_dump(),
        fecha_esperada_parto=fecha_esperada,
    )
    db.add(prenez)
    db.commit()
    db.refresh(prenez)
    return prenez


@router.patch("/{prenez_id}", response_model=PrenezRead)
def actualizar_prenez(
    ganaderia_id: int,
    prenez_id: int,
    body: PrenezUpdate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Actualiza la fecha de cubrición (recalculando el parto esperado) y/o el padre."""
    prenez = db.query(Prenez).filter_by(id=prenez_id, ganaderia_id=ganaderia_id).first()
    if not prenez:
        raise HTTPException(status_code=404, detail="Preñez no encontrada")
    if prenez.confirmado:
        raise HTTPException(status_code=400, detail="No se puede editar una preñez ya confirmada")

    if body.fecha_cubricion is not None:
        prenez.fecha_cubricion = body.fecha_cubricion
        prenez.fecha_esperada_parto = sumar_meses(
            body.fecha_cubricion, gestacion_meses(ganaderia_id, db)
        )

    # Actualizar padre: si se envía cualquier campo de padre, se sobreescriben todos
    # para evitar mezclar crotal_padre con padre_desc
    padre_campos = (body.crotal_padre, body.padre_desc, body.padre_ext_raza)
    if any(f is not None for f in padre_campos):
        prenez.crotal_padre = body.crotal_padre
        prenez.padre_desc = body.padre_desc
        prenez.padre_ext_raza = body.padre_ext_raza

    if body.notas is not None:
        prenez.notas = body.notas or None

    db.commit()
    db.refresh(prenez)
    return prenez


@router.patch("/{prenez_id}/confirmar", response_model=PrenezRead)
def confirmar_prenez(
    ganaderia_id: int,
    prenez_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Marca una preñez como confirmada (el nacimiento se registra por separado)."""
    prenez = db.query(Prenez).filter_by(id=prenez_id, ganaderia_id=ganaderia_id).first()
    if not prenez:
        raise HTTPException(status_code=404, detail="Preñez no encontrada")
    if prenez.confirmado:
        raise HTTPException(status_code=400, detail="La preñez ya estaba confirmada")
    prenez.confirmado = True
    db.commit()
    db.refresh(prenez)
    return prenez


@router.delete("/{prenez_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_prenez(
    ganaderia_id: int,
    prenez_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    prenez = db.query(Prenez).filter_by(id=prenez_id, ganaderia_id=ganaderia_id).first()
    if not prenez:
        raise HTTPException(status_code=404, detail="Preñez no encontrada")
    db.delete(prenez)
    db.commit()
