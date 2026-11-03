from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.core.deps import get_ganaderia_usuario
from app.db.database import get_db
from app.models.ganaderia import GanaderiaUsuario
from app.models.gasto import CategoriaGasto, Gasto
from app.schemas.gasto import (
    GastoCreate,
    GastoRead,
    GastoUpdate,
    ResumenAnioGastos,
    SugerenciasGastos,
    _validar_tipo,
)

router = APIRouter(prefix="/ganaderias/{ganaderia_id}/gastos", tags=["gastos"])


def _get_gasto_o_404(db: Session, gasto_id: int, ganaderia_id: int) -> Gasto:
    gasto = db.query(Gasto).filter_by(id=gasto_id, ganaderia_id=ganaderia_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return gasto


@router.get("/", response_model=list[GastoRead])
def listar_gastos(
    ganaderia_id: int,
    anio: int | None = None,
    categoria: CategoriaGasto | None = None,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    query = db.query(Gasto).filter(Gasto.ganaderia_id == ganaderia_id)
    if anio:
        query = query.filter(extract("year", Gasto.fecha) == anio)
    if categoria:
        query = query.filter(Gasto.categoria == categoria)
    return query.order_by(Gasto.fecha.desc(), Gasto.id.desc()).all()


@router.post("/", response_model=GastoRead, status_code=status.HTTP_201_CREATED)
def registrar_gasto(
    ganaderia_id: int,
    body: GastoCreate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    gasto = Gasto(ganaderia_id=ganaderia_id, **body.model_dump())
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    return gasto


@router.patch("/{gasto_id}", response_model=GastoRead)
def actualizar_gasto(
    ganaderia_id: int,
    gasto_id: int,
    body: GastoUpdate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    gasto = _get_gasto_o_404(db, gasto_id, ganaderia_id)
    cambios = body.model_dump(exclude_unset=True)
    for campo in ("fecha", "categoria", "tipo", "precio"):
        if campo in cambios and cambios[campo] is None:
            raise HTTPException(status_code=422, detail=f"El campo {campo} no puede quedar vacío")

    # Si cambia la categoría o el tipo, el tipo tiene que ser válido para la categoría final
    if "categoria" in cambios or "tipo" in cambios:
        categoria = cambios.get("categoria", gasto.categoria)
        tipo = cambios.get("tipo", gasto.tipo)
        try:
            cambios["tipo"] = _validar_tipo(categoria, tipo)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

    for campo, valor in cambios.items():
        setattr(gasto, campo, valor)
    db.commit()
    db.refresh(gasto)
    return gasto


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_gasto(
    ganaderia_id: int,
    gasto_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    db.delete(_get_gasto_o_404(db, gasto_id, ganaderia_id))
    db.commit()


@router.get("/resumen", response_model=list[ResumenAnioGastos])
def resumen_por_anios(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Gasto total de cada año, desglosado por categoría (del año más reciente al más antiguo)."""
    anio_col = extract("year", Gasto.fecha)
    filas = (
        db.query(anio_col, Gasto.categoria, func.sum(Gasto.precio))
        .filter(Gasto.ganaderia_id == ganaderia_id)
        .group_by(anio_col, Gasto.categoria)
        .all()
    )
    por_anio: dict[int, ResumenAnioGastos] = {}
    for anio, categoria, suma in filas:
        anio = int(anio)
        r = por_anio.setdefault(anio, ResumenAnioGastos(anio=anio))
        setattr(r, categoria.value, Decimal(suma))
        r.total += Decimal(suma)
    return sorted(por_anio.values(), key=lambda r: r.anio, reverse=True)


@router.get("/sugerencias", response_model=SugerenciasGastos)
def sugerencias(
    ganaderia_id: int,
    categoria: CategoriaGasto | None = None,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Vendedores y tipos ya usados (los más frecuentes primero) para autocompletar el formulario."""
    def mas_usados(columna, filtro_categoria: bool) -> list[str]:
        q = db.query(columna, func.count()).filter(Gasto.ganaderia_id == ganaderia_id, columna.isnot(None))
        if filtro_categoria and categoria:
            q = q.filter(Gasto.categoria == categoria)
        conteo: dict[str, tuple[str, int]] = defaultdict(lambda: ("", 0))
        for valor, n in q.group_by(columna).all():
            clave = valor.strip().lower()
            previo, total = conteo[clave]
            # Si hay variantes de mayúsculas, se queda con la más usada
            conteo[clave] = (valor if n > (total if previo else -1) else previo, total + n)
        return [v for v, _ in sorted(conteo.values(), key=lambda x: -x[1])][:30]

    return SugerenciasGastos(
        vendedores=mas_usados(Gasto.vendedor, filtro_categoria=False),
        tipos=mas_usados(Gasto.tipo, filtro_categoria=True),
    )
