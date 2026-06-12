"""
Router del asistente IA de Herdix.
Usa el SDK de Anthropic con tool-use para consultar la base de datos
y responder preguntas en lenguaje natural sobre la ganadería.
"""
import json
import os
from datetime import date, datetime

from openai import OpenAI
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_ganaderia_usuario
from app.db.database import get_db
from app.models.animal import Animal
from app.models.animal_historial import AnimalHistorial
from app.models.compra import CompraAnio
from app.models.ganaderia import Ganaderia, GanaderiaUsuario
from app.models.nacimiento import NacimientoAnio
from app.models.reproduccion import Prenez
from app.models.venta import VentaAnio

router = APIRouter(
    prefix="/ganaderias/{ganaderia_id}/agente",
    tags=["agente"],
)

# ─── Schemas ──────────────────────────────────────────────────────────────────

class MensajeHistorial(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] = []

class ChatResponse(BaseModel):
    respuesta: str

# ─── Cliente Anthropic (singleton) ───────────────────────────────────────────

def _get_client() -> OpenAI:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="El asistente no está configurado. Añade GROQ_API_KEY al entorno.",
        )
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

# ─── Herramientas disponibles ─────────────────────────────────────────────────

def _tool(name: str, description: str, parameters: dict) -> dict:
    """Construye una herramienta en formato OpenAI/Groq."""
    return {"type": "function", "function": {"name": name, "description": description, "parameters": parameters}}


HERRAMIENTAS: list[dict] = [
    _tool("estadisticas_ganaderia",
        "Devuelve un resumen estadístico de la ganadería: total de animales en censo activo, "
        "distribución por sexo, distribución por rol (madre/padre/recría) y las razas más frecuentes.",
        {"type": "object", "properties": {}, "required": []}),
    _tool("listar_animales",
        "Lista los animales del censo activo con filtros opcionales. Devuelve crotal, nombre, sexo, rol, raza y fecha de nacimiento.",
        {"type": "object", "properties": {
            "sexo": {"type": "string", "enum": ["hembra", "macho"], "description": "Filtrar por sexo"},
            "rol": {"type": "string", "enum": ["madre", "padre", "recría"], "description": "Filtrar por rol"},
            "raza": {"type": "string", "description": "Filtro parcial por nombre de raza"},
            "nombre": {"type": "string", "description": "Filtro parcial por nombre del animal"},
        }, "required": []}),
    _tool("detalle_animal",
        "Obtiene todos los datos de un animal concreto (en censo o historial) a partir de su crotal. "
        "Incluye composición racial, genealogía y, si ya salió, el motivo y fecha de salida.",
        {"type": "object", "properties": {
            "crotal": {"type": "string", "description": "Crotal completo del animal"},
        }, "required": ["crotal"]}),
    _tool("listar_nacimientos",
        "Lista los nacimientos registrados, opcionalmente filtrados por año, sexo de la cría o nombre/crotal de la madre.",
        {"type": "object", "properties": {
            "anio": {"type": "integer", "description": "Año concreto. Omitir para todos los años."},
            "sexo": {"type": "string", "enum": ["macho", "hembra"], "description": "Filtrar por sexo de la cría."},
            "crotal_madre": {"type": "string", "description": "Crotal exacto de la madre."},
            "nombre_madre": {"type": "string", "description": "Nombre parcial de la madre."},
        }, "required": []}),
    _tool("hijos_de_animal",
        "Dado el nombre o crotal de un animal, devuelve todas sus crías con sexo, fecha y datos de venta si aplica. "
        "Úsala cuando se pregunte por los hijos, terneros, potros o crías de un animal concreto.",
        {"type": "object", "properties": {
            "nombre": {"type": "string", "description": "Nombre del animal (búsqueda parcial)."},
            "crotal": {"type": "string", "description": "Crotal exacto del animal."},
            "sexo_cria": {"type": "string", "enum": ["macho", "hembra"], "description": "Filtrar crías por sexo."},
        }, "required": []}),
    _tool("listar_salidas",
        "Lista el historial de salidas (ventas, muertes, sacrificios, depredadores, etc.), opcionalmente filtradas.",
        {"type": "object", "properties": {
            "anio": {"type": "integer", "description": "Año concreto. Omitir para todos."},
            "motivo": {"type": "string", "description": "Motivo: venta, muerte_natural, sacrificio, depredador, otro"},
        }, "required": []}),
    _tool("listar_compras",
        "Lista las compras de animales registradas, opcionalmente filtradas por año. Incluye precio y vendedor.",
        {"type": "object", "properties": {
            "anio": {"type": "integer", "description": "Año concreto. Omitir para todos."},
        }, "required": []}),
    _tool("listar_ventas",
        "Lista las ventas con nombre del animal, comprador, precio, destino (carne/vida) y fecha. "
        "Úsala cuando se pregunte por compradores, precios de venta o destino de los animales vendidos.",
        {"type": "object", "properties": {
            "anio": {"type": "integer", "description": "Año concreto. Omitir para todos."},
            "comprador": {"type": "string", "description": "Filtro parcial por nombre del comprador."},
            "crotal": {"type": "string", "description": "Crotal exacto del animal vendido."},
        }, "required": []}),
    _tool("listar_prenyeces",
        "Lista las preñeces activas con nombre y crotal de madre, fecha de cubrición, fecha esperada de parto y días que quedan.",
        {"type": "object", "properties": {}, "required": []}),
]

# ─── Serialización ────────────────────────────────────────────────────────────

def _s(obj):
    """Convierte tipos no-JSON (date, datetime) a string."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _s(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_s(v) for v in obj]
    return obj

def _raza_texto(composicion: dict | None) -> str | None:
    if not composicion:
        return None
    if len(composicion) == 1:
        raza, pct = next(iter(composicion.items()))
        return raza if pct == 100 else f"{raza} ({pct}%)"
    partes = sorted(composicion.items(), key=lambda x: x[1], reverse=True)
    return " / ".join(f"{r} {p}%" for r, p in partes)

# ─── Implementación de herramientas ───────────────────────────────────────────

def _estadisticas(db: Session, ganaderia_id: int) -> dict:
    animales = db.query(Animal).filter_by(ganaderia_id=ganaderia_id).all()
    por_sexo: dict[str, int] = {}
    por_rol: dict[str, int] = {}
    raza_count: dict[str, int] = {}

    for a in animales:
        por_sexo[a.sexo] = por_sexo.get(a.sexo, 0) + 1
        por_rol[a.rol] = por_rol.get(a.rol, 0) + 1
        if a.composicion_racial:
            principal = max(a.composicion_racial, key=lambda k: a.composicion_racial[k])
            raza_count[principal] = raza_count.get(principal, 0) + 1

    razas_top = sorted(raza_count.items(), key=lambda x: x[1], reverse=True)[:5]
    return {
        "total_animales_en_censo": len(animales),
        "por_sexo": por_sexo,
        "por_rol": por_rol,
        "razas_mas_frecuentes": [{"raza": r, "cantidad": c} for r, c in razas_top],
    }


def _listar_animales(db: Session, ganaderia_id: int, params: dict) -> dict:
    q = db.query(Animal).filter_by(ganaderia_id=ganaderia_id)
    if sexo := params.get("sexo"):
        q = q.filter(Animal.sexo == sexo)
    if rol := params.get("rol"):
        q = q.filter(Animal.rol == rol)
    if nombre := params.get("nombre"):
        q = q.filter(Animal.nombre.ilike(f"%{nombre}%"))

    animales = q.order_by(Animal.nombre.asc().nullslast()).all()

    if raza := params.get("raza"):
        raza_lower = raza.lower()
        animales = [
            a for a in animales
            if any(r.lower().find(raza_lower) >= 0 for r in (a.composicion_racial or {}).keys())
        ]

    return {
        "total": len(animales),
        "animales": [
            {
                "crotal": a.crotal,
                "nombre": a.nombre,
                "sexo": a.sexo,
                "rol": a.rol,
                "fecha_nacimiento": _s(a.fecha_nacimiento),
                "raza": _raza_texto(a.composicion_racial),
            }
            for a in animales
        ],
    }


def _detalle_animal(db: Session, ganaderia_id: int, params: dict) -> dict:
    crotal = params.get("crotal", "").strip()
    animal = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
    if animal:
        return {
            "encontrado": True,
            "en_censo": True,
            "crotal": animal.crotal,
            "nombre": animal.nombre,
            "sexo": animal.sexo,
            "rol": animal.rol,
            "fecha_nacimiento": _s(animal.fecha_nacimiento),
            "raza": _raza_texto(animal.composicion_racial),
            "composicion_racial": animal.composicion_racial,
            "madre_crotal": animal.madre_crotal,
            "padre_crotal": animal.padre_crotal,
        }

    historial = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
    if historial:
        return {
            "encontrado": True,
            "en_censo": False,
            "crotal": historial.crotal,
            "nombre": historial.nombre,
            "sexo": historial.sexo,
            "rol": historial.rol,
            "fecha_nacimiento": _s(historial.fecha_nacimiento),
            "raza": _raza_texto(historial.composicion_racial),
            "fecha_salida": _s(historial.fecha_salida),
            "motivo_salida": historial.motivo_salida,
        }

    return {"encontrado": False, "mensaje": f"No se encontró ningún animal con crotal {crotal}."}


def _listar_nacimientos(db: Session, ganaderia_id: int, params: dict) -> dict:
    q = db.query(NacimientoAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio := params.get("anio"):
        q = q.filter(NacimientoAnio.anio == anio)
    if sexo := params.get("sexo"):
        q = q.filter(NacimientoAnio.sexo == sexo)
    if crotal_madre := params.get("crotal_madre"):
        q = q.filter(NacimientoAnio.crotal_madre == crotal_madre)
    nacimientos = q.order_by(NacimientoAnio.fecha_exacta.desc().nullslast()).all()

    # Filtro por nombre de madre (busca en censo y en historial)
    if nombre_madre := params.get("nombre_madre"):
        nombre_lower = nombre_madre.lower()
        crotals_madre = set()
        for a in db.query(Animal).filter_by(ganaderia_id=ganaderia_id).filter(Animal.nombre.ilike(f"%{nombre_lower}%")).all():
            crotals_madre.add(a.crotal)
        for a in db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id).filter(AnimalHistorial.nombre.ilike(f"%{nombre_lower}%")).all():
            crotals_madre.add(a.crotal)
        nacimientos = [n for n in nacimientos if n.crotal_madre in crotals_madre]

    # Enriquecer con nombre de la cría
    def _nombre_cria(crotal):
        a = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        if a:
            return a.nombre
        h = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        return h.nombre if h else None

    def _nombre_animal(crotal):
        if not crotal:
            return None
        a = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        if a:
            return a.nombre
        h = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        return h.nombre if h else None

    return {
        "total": len(nacimientos),
        "nacimientos": [
            {
                "anio": n.anio,
                "fecha": _s(n.fecha_exacta),
                "nombre_cria": _nombre_cria(n.crotal_animal),
                "crotal_cria": n.crotal_animal,
                "sexo": n.sexo,
                "nombre_madre": _nombre_animal(n.crotal_madre),
                "crotal_madre": n.crotal_madre,
                "nombre_padre": _nombre_animal(n.crotal_padre),
                "crotal_padre": n.crotal_padre,
                "padre_desc": n.padre_desc,
                "notas": n.notas,
            }
            for n in nacimientos
        ],
    }


def _listar_salidas(db: Session, ganaderia_id: int, params: dict) -> dict:
    q = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id)
    if anio := params.get("anio"):
        q = q.filter(func.extract("year", AnimalHistorial.fecha_salida) == anio)
    if motivo := params.get("motivo"):
        q = q.filter(AnimalHistorial.motivo_salida == motivo)
    salidas = q.order_by(AnimalHistorial.fecha_salida.desc()).all()
    return {
        "total": len(salidas),
        "salidas": [
            {
                "crotal": s.crotal,
                "nombre": s.nombre,
                "fecha_salida": _s(s.fecha_salida),
                "motivo": s.motivo_salida,
                "sexo": s.sexo,
                "rol": s.rol,
            }
            for s in salidas
        ],
    }


def _listar_compras(db: Session, ganaderia_id: int, params: dict) -> dict:
    q = db.query(CompraAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio := params.get("anio"):
        q = q.filter(CompraAnio.anio == anio)
    compras = q.order_by(CompraAnio.fecha_exacta.desc()).all()
    def _nombre_comprado(crotal):
        a = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        return a.nombre if a else None

    return {
        "total": len(compras),
        "compras": [
            {
                "nombre": _nombre_comprado(c.crotal_animal),
                "crotal": c.crotal_animal,
                "fecha": _s(c.fecha_exacta),
                "precio_eur": c.precio,
                "vendedor": c.vendedor,
                "notas": c.notas,
            }
            for c in compras
        ],
    }


def _listar_ventas(db: Session, ganaderia_id: int, params: dict) -> dict:
    q = db.query(VentaAnio).filter_by(ganaderia_id=ganaderia_id)
    if anio := params.get("anio"):
        q = q.filter(VentaAnio.anio == anio)
    if comprador := params.get("comprador"):
        q = q.filter(VentaAnio.comprador.ilike(f"%{comprador}%"))
    if crotal := params.get("crotal"):
        q = q.filter(VentaAnio.crotal_animal == crotal)
    ventas = q.order_by(VentaAnio.fecha_exacta.desc()).all()

    def _nombre_animal(crotal):
        h = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        return h.nombre if h else None

    return {
        "total": len(ventas),
        "ventas": [
            {
                "crotal": v.crotal_animal,
                "nombre": _nombre_animal(v.crotal_animal),
                "fecha": _s(v.fecha_exacta),
                "comprador": v.comprador,
                "precio_eur": float(v.precio) if v.precio else None,
                "destino": v.destino,
                "notas": v.notas,
            }
            for v in ventas
        ],
    }


def _hijos_de_animal(db: Session, ganaderia_id: int, params: dict) -> dict:
    # Buscar el animal por nombre o crotal
    crotal = params.get("crotal", "").strip()
    nombre = params.get("nombre", "").strip()
    sexo_cria = params.get("sexo_cria")

    animal = None
    if crotal:
        animal = (
            db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
            or db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        )
    elif nombre:
        animal = (
            db.query(Animal).filter_by(ganaderia_id=ganaderia_id).filter(Animal.nombre.ilike(f"%{nombre}%")).first()
            or db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id).filter(AnimalHistorial.nombre.ilike(f"%{nombre}%")).first()
        )

    if not animal:
        return {"encontrado": False, "mensaje": "No se encontró el animal indicado."}

    # Buscar nacimientos donde sea madre o padre
    q = db.query(NacimientoAnio).filter_by(ganaderia_id=ganaderia_id).filter(
        NacimientoAnio.crotal_madre == animal.crotal
    )
    if sexo_cria:
        q = q.filter(NacimientoAnio.sexo == sexo_cria)
    nacimientos = q.order_by(NacimientoAnio.fecha_exacta.desc().nullslast()).all()

    # Enriquecer cada cría con nombre y datos de venta si aplica
    ventas_map = {
        v.crotal_animal: v
        for v in db.query(VentaAnio).filter_by(ganaderia_id=ganaderia_id).all()
    }

    def _nombre_cria(c):
        a = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=c).first()
        if a:
            return a.nombre
        h = db.query(AnimalHistorial).filter_by(ganaderia_id=ganaderia_id, crotal=c).first()
        return h.nombre if h else None

    hijos = []
    for n in nacimientos:
        venta = ventas_map.get(n.crotal_animal)
        hijos.append({
            "crotal": n.crotal_animal,
            "nombre": _nombre_cria(n.crotal_animal),
            "sexo": n.sexo,
            "fecha_nacimiento": _s(n.fecha_exacta),
            "vendido": venta is not None,
            "comprador": venta.comprador if venta else None,
            "precio_eur": float(venta.precio) if venta and venta.precio else None,
            "fecha_venta": _s(venta.fecha_exacta) if venta else None,
        })

    return {
        "animal": {"crotal": animal.crotal, "nombre": animal.nombre},
        "total_hijos": len(hijos),
        "hijos": hijos,
    }


def _listar_prenyeces(db: Session, ganaderia_id: int) -> dict:
    hoy = date.today()
    prenyeces = (
        db.query(Prenez)
        .filter_by(ganaderia_id=ganaderia_id, confirmado=False)
        .order_by(Prenez.fecha_esperada_parto.asc())
        .all()
    )

    def _nombre(crotal):
        if not crotal:
            return None
        a = db.query(Animal).filter_by(ganaderia_id=ganaderia_id, crotal=crotal).first()
        return a.nombre if a else crotal

    return {
        "total_activas": len(prenyeces),
        "prenyeces": [
            {
                "nombre_madre": _nombre(p.crotal_madre),
                "crotal_madre": p.crotal_madre,
                "fecha_cubricion": _s(p.fecha_cubricion),
                "fecha_esperada_parto": _s(p.fecha_esperada_parto),
                "dias_para_parto": (p.fecha_esperada_parto - hoy).days if p.fecha_esperada_parto else None,
                "nombre_padre": _nombre(p.crotal_padre),
                "crotal_padre": p.crotal_padre,
                "padre_desc": p.padre_desc,
                "notas": p.notas,
            }
            for p in prenyeces
        ],
    }


def _ejecutar_herramienta(nombre: str, params: dict, db: Session, ganaderia_id: int) -> dict:
    mapa = {
        "estadisticas_ganaderia": lambda: _estadisticas(db, ganaderia_id),
        "listar_animales": lambda: _listar_animales(db, ganaderia_id, params),
        "detalle_animal": lambda: _detalle_animal(db, ganaderia_id, params),
        "listar_nacimientos": lambda: _listar_nacimientos(db, ganaderia_id, params),
        "listar_salidas": lambda: _listar_salidas(db, ganaderia_id, params),
        "listar_compras": lambda: _listar_compras(db, ganaderia_id, params),
        "listar_ventas": lambda: _listar_ventas(db, ganaderia_id, params),
        "hijos_de_animal": lambda: _hijos_de_animal(db, ganaderia_id, params),
        "listar_prenyeces": lambda: _listar_prenyeces(db, ganaderia_id),
    }
    fn = mapa.get(nombre)
    return fn() if fn else {"error": f"Herramienta desconocida: {nombre}"}


# ─── Endpoint principal ───────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(
    ganaderia_id: int,
    body: ChatRequest,
    gu: GanaderiaUsuario = Depends(get_ganaderia_usuario),
    db: Session = Depends(get_db),
):
    """Envía un mensaje al asistente IA y recibe una respuesta con datos reales de la ganadería."""
    cliente = _get_client()

    ganaderia = db.get(Ganaderia, ganaderia_id)
    if not ganaderia:
        raise HTTPException(status_code=404, detail="Ganadería no encontrada")

    hoy = date.today().strftime("%d de %B de %Y")
    tipo_label = ganaderia.tipo.value if ganaderia.tipo else "bovino"

    system_prompt = (
        f'Eres el asistente de gestión de la ganadería "{ganaderia.nombre}" (tipo: {tipo_label}).\n'
        f"Hoy es {hoy}.\n\n"
        "Tu función es responder preguntas sobre los animales, nacimientos, compras, ventas, "
        "reproducciones y estadísticas de esta ganadería.\n"
        "Usa siempre las herramientas para obtener datos reales antes de responder — nunca inventes cifras.\n"
        "IMPORTANTE — nombres de animales: el ganadero conoce a sus animales por el NOMBRE, no por el crotal. "
        "Al responder, usa siempre el nombre del animal como identificador principal. "
        "El crotal solo lo incluyes entre paréntesis como dato adicional si aporta valor, "
        "o si el animal no tiene nombre. Nunca respondas con solo el crotal.\n"
        "Responde en español, de forma clara y directa. Puedes usar listas cuando ayude a la claridad.\n"
        "Si el usuario saluda o hace una pregunta general, responde amablemente sin necesidad de consultar datos."
    )

    # Construir historial de mensajes
    mensajes: list[dict] = [
        {"role": m.role, "content": m.content} for m in body.historial
    ]
    mensajes.append({"role": "user", "content": body.mensaje})

    modelo = os.environ.get("AGENTE_MODEL", "llama-3.3-70b-versatile")

    # Insertar system prompt al inicio del historial
    mensajes = [{"role": "system", "content": system_prompt}] + mensajes

    # Bucle agente: max 8 rondas de tool-use para evitar loops infinitos
    for _ in range(8):
        respuesta = cliente.chat.completions.create(
            model=modelo,
            messages=mensajes,   # type: ignore[arg-type]
            tools=HERRAMIENTAS,  # type: ignore[arg-type]
            max_tokens=2048,
        )

        choice = respuesta.choices[0]

        if choice.finish_reason == "stop":
            return ChatResponse(respuesta=choice.message.content or "")

        if choice.finish_reason == "tool_calls":
            tool_calls = choice.message.tool_calls or []

            # Añadir turno del asistente con sus tool_calls al historial
            mensajes.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            })

            # Ejecutar cada herramienta y añadir resultados
            for tc in tool_calls:
                try:
                    params = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    params = {}
                resultado = _ejecutar_herramienta(tc.function.name, params, db, ganaderia_id)
                mensajes.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(_s(resultado), ensure_ascii=False),
                })
        else:
            break

    return ChatResponse(respuesta="No pude completar la consulta. Por favor, inténtalo de nuevo.")
