from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_ganaderia_usuario
from app.db.database import get_db
from app.models.animal import Animal, RolAnimal
from app.models.animal_historial import AnimalHistorial
from app.models.compra import CompraAnio
from app.models.ganaderia import GanaderiaUsuario
from app.models.nacimiento import NacimientoAnio
from app.models.reproduccion import Prenez
from app.models.venta import VentaAnio
from app.schemas.animal import AnimalCreate, AnimalRead, AnimalUpdate, CrotalUpdate
from app.schemas.animal_historial import AnimalSalidaRequest, AnimalHistorialRead
from app.schemas.nacimiento import NacimientoCreate, NacimientoRead

router = APIRouter(prefix="/ganaderias/{ganaderia_id}/animales", tags=["animales"])


def _get_animal_o_404(db: Session, crotal: str, ganaderia_id: int) -> Animal:
    animal = db.query(Animal).filter_by(crotal=crotal, ganaderia_id=ganaderia_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail=f"Animal {crotal} no encontrado")
    return animal


def _crotal_en_uso(db: Session, crotal: str) -> bool:
    return (
        db.query(Animal.crotal).filter_by(crotal=crotal).first() is not None
        or db.query(AnimalHistorial.crotal).filter_by(crotal=crotal).first() is not None
    )


def _nuevo_crotal_provisional(db: Session) -> str:
    """Genera un crotal provisional aleatorio que no exista ya."""
    for _ in range(10):
        candidato = Animal.generar_crotal_provisional()
        if not _crotal_en_uso(db, candidato):
            return candidato
    raise HTTPException(status_code=500, detail="No se pudo generar un crotal provisional")


# Columnas que guardan un crotal como "FK blanda" y deben seguir al animal si cambia
_REFERENCIAS_CROTAL = [
    (Animal, ("madre_crotal", "padre_crotal")),
    (AnimalHistorial, ("madre_crotal", "padre_crotal")),
    (NacimientoAnio, ("crotal_animal", "crotal_madre", "crotal_padre")),
    (Prenez, ("crotal_madre", "crotal_padre")),
    (CompraAnio, ("crotal_animal",)),
    (VentaAnio, ("crotal_animal",)),
]


# ─── Animales activos ──────────────────────────────────────────────────────────

@router.get("/", response_model=list[AnimalRead])
def listar_animales(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Lista todos los animales activos de la ganadería."""
    return db.query(Animal).filter_by(ganaderia_id=ganaderia_id).all()


@router.post("/", response_model=AnimalRead, status_code=status.HTTP_201_CREATED)
def crear_animal(
    ganaderia_id: int,
    body: AnimalCreate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Añade un animal al censo activo."""
    if body.ganaderia_id != ganaderia_id:
        raise HTTPException(status_code=400, detail="ganaderia_id no coincide con la URL")

    datos = body.model_dump()
    if body.crotal:
        if db.query(Animal).filter_by(crotal=body.crotal).first():
            raise HTTPException(status_code=409, detail=f"El crotal {body.crotal} ya existe")
        datos["crotal_provisional"] = False
    else:
        datos["crotal"] = _nuevo_crotal_provisional(db)
        datos["crotal_provisional"] = True

    raza_texto = Animal.calcular_raza_texto(body.composicion_racial)
    animal = Animal(**datos, raza_texto=raza_texto, fecha_alta=date.today())
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal


@router.get("/{crotal}", response_model=AnimalRead)
def obtener_animal(
    ganaderia_id: int,
    crotal: str,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    return _get_animal_o_404(db, crotal, ganaderia_id)


@router.patch("/{crotal}", response_model=AnimalRead)
def actualizar_animal(
    ganaderia_id: int,
    crotal: str,
    body: AnimalUpdate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Actualiza campos editables del animal."""
    animal = _get_animal_o_404(db, crotal, ganaderia_id)
    datos = body.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        setattr(animal, campo, valor)
    if "composicion_racial" in datos:
        animal.raza_texto = Animal.calcular_raza_texto(animal.composicion_racial)
    db.commit()
    db.refresh(animal)
    return animal


@router.patch("/{crotal}/crotal", response_model=AnimalRead)
def cambiar_crotal(
    ganaderia_id: int,
    crotal: str,
    body: CrotalUpdate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """
    Sustituye el crotal de un animal (normalmente el provisional por el oficial de la
    Consejería). Solo se permite dentro del plazo desde su alta en la app; pasado ese
    plazo el crotal queda fijo. Actualiza todas las referencias al crotal antiguo
    (genealogía, nacimientos, preñeces, compras y ventas) en la misma transacción.
    """
    animal = _get_animal_o_404(db, crotal, ganaderia_id)

    if not animal.crotal_editable:
        if animal.crotal_editable_hasta is None:
            detalle = "El crotal de este animal no se puede modificar"
        else:
            detalle = (
                "Ha vencido el plazo para modificar el crotal "
                f"(finalizó el {animal.crotal_editable_hasta.strftime('%d/%m/%Y')})"
            )
        raise HTTPException(status_code=403, detail=detalle)

    nuevo = body.nuevo_crotal
    if nuevo == animal.crotal:
        return animal
    if _crotal_en_uso(db, nuevo):
        raise HTTPException(status_code=409, detail=f"El crotal {nuevo} ya existe")

    # Trabajamos con UPDATE masivos: sacamos el objeto de la sesión para que
    # el identity map no choque con el cambio de clave primaria.
    db.expunge(animal)
    db.query(Animal).filter(Animal.crotal == crotal).update(
        {Animal.crotal: nuevo, Animal.crotal_provisional: False},
        synchronize_session=False,
    )
    for modelo, columnas in _REFERENCIAS_CROTAL:
        for nombre_col in columnas:
            col = getattr(modelo, nombre_col)
            db.query(modelo).filter(
                modelo.ganaderia_id == ganaderia_id, col == crotal
            ).update({col: nuevo}, synchronize_session=False)
    db.commit()

    return _get_animal_o_404(db, nuevo, ganaderia_id)


@router.delete("/{crotal}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_animal(
    ganaderia_id: int,
    crotal: str,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Elimina un animal del censo (borrado físico, solo si fue introducido por error)."""
    animal = _get_animal_o_404(db, crotal, ganaderia_id)
    db.delete(animal)
    db.commit()


@router.post("/{crotal}/salida", response_model=AnimalHistorialRead)
def registrar_salida(
    ganaderia_id: int,
    crotal: str,
    body: AnimalSalidaRequest,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """
    Registra la salida de un animal (venta, muerte, depredador, sacrificio, cesión).
    Copia sus datos a ANIMALES_HISTORIAL y lo elimina de ANIMALES.
    Si hay precio, también crea un registro en VENTAS_AÑO.
    """
    animal = _get_animal_o_404(db, crotal, ganaderia_id)

    historial = AnimalHistorial(
        crotal=animal.crotal,
        nombre=animal.nombre,
        fecha_nacimiento=animal.fecha_nacimiento,
        sexo=animal.sexo,
        rol=animal.rol,
        composicion_racial=animal.composicion_racial,
        raza_texto=animal.raza_texto,
        padre_crotal=animal.padre_crotal,
        padre_desc=animal.padre_desc,
        madre_crotal=animal.madre_crotal,
        ganaderia_id=animal.ganaderia_id,
        fecha_salida=body.fecha_salida,
        motivo_salida=body.motivo_salida,
        precio=body.precio,
        comprador=body.comprador,
        notas=body.notas,
    )
    db.add(historial)

    if body.precio is not None:
        venta = VentaAnio(
            anio=body.fecha_salida.year,
            fecha_exacta=body.fecha_salida,
            crotal_animal=animal.crotal,
            ganaderia_id=ganaderia_id,
            comprador=body.comprador,
            precio=body.precio,
            destino=body.destino,
            notas=body.notas,
        )
        db.add(venta)

    db.delete(animal)
    db.commit()
    db.refresh(historial)
    return historial


# ─── Historial ─────────────────────────────────────────────────────────────────

@router.get("/historial/", response_model=list[AnimalHistorialRead])
def listar_historial(
    ganaderia_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    return db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id).all()


@router.delete("/historial/{crotal}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_historial(
    ganaderia_id: int,
    crotal: str,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Elimina una entrada del historial (borrado físico, solo si fue introducida por error)."""
    entry = db.query(AnimalHistorial).filter_by(crotal=crotal, ganaderia_id=ganaderia_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registro no encontrado en el historial")
    db.delete(entry)
    db.commit()


# ─── Nacimientos ───────────────────────────────────────────────────────────────

@router.post("/nacimientos/", response_model=NacimientoRead, status_code=status.HTTP_201_CREATED)
def registrar_nacimiento(
    ganaderia_id: int,
    body: NacimientoCreate,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """
    Registra un nacimiento y crea automáticamente el ternero en el censo activo
    si su crotal no existe ya. El nombre se genera como 'sexo_nombreMadre'.
    """
    if body.ganaderia_id != ganaderia_id:
        raise HTTPException(status_code=400, detail="ganaderia_id no coincide con la URL")

    # Sin crotal oficial todavía → identificador provisional (editable durante el plazo)
    crotal_provisional = not body.crotal_animal
    if crotal_provisional:
        body.crotal_animal = _nuevo_crotal_provisional(db)

    # Auto-crear el ternero si no existe ya
    if crotal_provisional or not db.query(Animal).filter_by(crotal=body.crotal_animal).first():
        madre = db.query(Animal).filter_by(
            crotal=body.crotal_madre, ganaderia_id=ganaderia_id
        ).first()
        madre_ref = (madre.nombre or madre.crotal) if madre else body.crotal_madre

        nombre_ternero = f"{body.sexo.value}_{madre_ref}"

        # Calcular composición racial del ternero
        composicion_racial: dict = {}
        comp_madre = (madre.composicion_racial or {}) if madre else {}

        if body.crotal_padre:
            # Padre en ganadería
            padre = db.query(Animal).filter_by(
                crotal=body.crotal_padre, ganaderia_id=ganaderia_id
            ).first()
            if padre and padre.composicion_racial and comp_madre:
                composicion_racial = Animal.calcular_composicion_hijo(
                    padre.composicion_racial, comp_madre
                )
            elif padre and padre.composicion_racial:
                composicion_racial = padre.composicion_racial
        elif body.padre_ext_raza:
            # Toro externo con raza conocida
            comp_padre_ext = {body.padre_ext_raza: 100}
            if comp_madre:
                composicion_racial = Animal.calcular_composicion_hijo(comp_padre_ext, comp_madre)
            else:
                composicion_racial = comp_padre_ext
        elif comp_madre:
            # Sin padre conocido: hereda la composición de la madre
            composicion_racial = comp_madre

        ternero = Animal(
            crotal=body.crotal_animal,
            nombre=nombre_ternero,
            fecha_nacimiento=body.fecha_exacta or date.today(),
            sexo=body.sexo,
            rol=RolAnimal.recria,
            composicion_racial=composicion_racial,
            raza_texto=Animal.calcular_raza_texto(composicion_racial),
            ganaderia_id=ganaderia_id,
            madre_crotal=body.crotal_madre,
            padre_crotal=body.crotal_padre,
            padre_desc=body.padre_desc,
            fecha_alta=date.today(),
            crotal_provisional=crotal_provisional,
        )
        db.add(ternero)

    # padre_ext_raza es solo para calcular composición del ternero, no se almacena en nacimientos
    nacimiento = NacimientoAnio(**body.model_dump(exclude={"padre_ext_raza"}))
    db.add(nacimiento)
    db.commit()
    db.refresh(nacimiento)
    return nacimiento


@router.get("/nacimientos/", response_model=list[NacimientoRead])
def listar_nacimientos(
    ganaderia_id: int,
    anio: int | None = None,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    query = db.query(NacimientoAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio:
        query = query.filter_by(anio=anio)
    return query.all()


@router.delete("/nacimientos/{nacimiento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_nacimiento(
    ganaderia_id: int,
    nacimiento_id: int,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Elimina un registro de nacimiento (no elimina el animal del censo)."""
    nac = db.query(NacimientoAnio).filter_by(
        id=nacimiento_id, ganaderia_id=ganaderia_id
    ).first()
    if not nac:
        raise HTTPException(status_code=404, detail="Nacimiento no encontrado")
    db.delete(nac)
    db.commit()
