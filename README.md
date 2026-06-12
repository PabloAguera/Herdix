# Herdix

Aplicación web de gestión ganadera para explotaciones bovinas y equinas. Permite llevar el censo de animales, registrar nacimientos, reproducción, compras y ventas, con un asistente IA integrado que responde preguntas en lenguaje natural sobre los datos de la explotación.

---

## Tecnologías

### Backend
- **FastAPI** — Framework REST API
- **SQLAlchemy 2** — ORM
- **Alembic** — Migraciones de base de datos
- **PostgreSQL 16** — Base de datos
- **Pydantic 2** — Validación de esquemas
- **python-jose** — JWT (autenticación)
- **passlib + bcrypt** — Hashing de contraseñas
- **OpenAI SDK** — Cliente para Groq API (compatible con OpenAI)
- **Uvicorn** — Servidor ASGI

### Frontend
- **React 18** + **TypeScript**
- **Vite** — Build tool
- **React Router 6** — Enrutado
- **Zustand** — Gestión de estado (con persistencia en localStorage)
- **Tailwind CSS** — Estilos
- **Radix UI** — Componentes accesibles (Dialog, Select, Toast, Dropdown, etc.)
- **Lucide React** — Iconos
- **Axios** — Cliente HTTP

### Infraestructura
- **Docker Compose** — Orquestación de servicios (PostgreSQL + Backend)
- **Groq API** — Inferencia LLM gratuita (modelo `llama-3.3-70b-versatile`)

---

## Funcionalidades implementadas

### Autenticación y usuarios
- Registro con lista blanca de emails (`ALLOWED_EMAILS` en `.env`)
- Login con email y contraseña, token JWT
- Roles por ganadería: **admin** y **colaborador**
- Sistema de invitaciones mediante token: el admin genera un enlace y cualquier usuario registrado puede unirse a la ganadería como colaborador
- Un usuario puede pertenecer a varias ganaderías con roles distintos en cada una

### Gestión de ganaderías
- Crear ganaderías de tipo **bovino** o **equino**
- Renombrar (solo admin)
- Listar miembros y expulsar colaboradores (solo admin)
- Generar y revocar enlaces de invitación (solo admin)

### Censo de animales
- Alta, edición y baja de animales en el censo activo
- Campos: crotal, nombre, sexo, rol (madre / padre / recría), fecha de nacimiento, composición racial
- **Composición racial automática**: al registrar un nacimiento, la genética de la cría se calcula automáticamente promediando la composición de ambos progenitores. Si solo se conoce la madre, hereda su composición. Razas con menos del 10% se agrupan como "otro"
- Genealogía: cada animal guarda referencia a madre y padre

### Historial de animales
- Al registrar la salida de un animal (venta, muerte natural, sacrificio, depredador, cesión), el animal pasa al historial de forma inmutable
- El historial conserva todos los datos del animal más fecha de salida y motivo
- Si la salida es por venta con precio, se crea automáticamente un registro en ventas

### Nacimientos
- Registro de nacimientos con fecha, sexo de la cría, madre y padre
- La cría se crea automáticamente en el censo activo si no existe
- Filtros por año

### Reproducción (preñeces)
- Registro de preñeces activas con fecha de cubrición, padre y notas
- Fecha esperada de parto calculada automáticamente (bovino: 9 meses, equino: 11 meses)
- Visualización de días restantes para el parto
- Confirmación del parto para archivar la preñez
- Alertas en el dashboard para partos esperados en menos de 10 días

### Ventas
- Registro de ventas con fecha, comprador, precio y destino (**carne** o **vida**)
- Historial de ventas filtrable por año
- Se crea automáticamente al registrar una salida por venta con precio

### Compras
- Registro de compras de animales con fecha, vendedor y precio
- Historial de compras filtrable por año

### Dashboard
- Total de animales en censo activo
- Nacimientos y ventas del año en curso
- Preñeces activas
- Ingresos por ventas del año en curso
- Banner de alertas para partos próximos (rojo ≤ 3 días, ámbar 4-10 días)
- Accesos rápidos a todas las secciones

### Búsqueda global
- Buscador en la barra superior que filtra animales del censo por nombre o crotal en tiempo real
- Navega directamente al detalle del animal seleccionado

### Asistente IA
- Chat en lenguaje natural para consultar datos de la ganadería
- Basado en Groq (gratuito, 14.000 peticiones/día)
- El agente dispone de **9 herramientas** para consultar la base de datos en tiempo real:
  - `estadisticas_ganaderia` — Resumen estadístico del censo
  - `listar_animales` — Filtros por sexo, rol, raza o nombre
  - `detalle_animal` — Ficha completa de un animal por crotal
  - `listar_nacimientos` — Nacimientos con filtros por año, sexo o madre
  - `hijos_de_animal` — Crías de un animal con datos de venta si aplica
  - `listar_salidas` — Historial de salidas por año o motivo
  - `listar_compras` — Compras por año
  - `listar_ventas` — Ventas con comprador, precio y destino
  - `listar_prenyeces` — Preñeces activas con días para el parto
- Responde en español usando nombres de animales como identificador principal
- Historial de conversaciones persistente por ganadería (localStorage)

---

## Estructura del proyecto

```
herdly/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuración, seguridad, dependencias
│   │   ├── db/            # Conexión a base de datos
│   │   ├── models/        # Modelos SQLAlchemy
│   │   ├── routers/       # Endpoints API
│   │   └── schemas/       # Esquemas Pydantic
│   ├── alembic/           # Migraciones de base de datos
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # Clientes Axios por recurso
│   │   ├── components/    # Componentes reutilizables (layout + ui)
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── router/        # Definición de rutas
│   │   ├── stores/        # Stores Zustand
│   │   └── types/         # Tipos TypeScript
│   └── package.json
├── docker-compose.yml
└── .env
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Groq API (gratuito en console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Emails con permiso para registrarse (separados por comas)
ALLOWED_EMAILS=tu@email.com,otro@email.com
```

Variables internas del backend (configuradas en `docker-compose.yml`):

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | postgresql://herdly:herdly_secret@db/herdly_db | Conexión a PostgreSQL |
| `SECRET_KEY` | (cambiar en producción) | Clave para firmar JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Expiración del token |
| `AGENTE_MODEL` | llama-3.3-70b-versatile | Modelo LLM del agente |

---

## Puesta en marcha

### Requisitos
- Docker y Docker Compose

### Arrancar
```bash
docker compose up --build -d
```

El backend estará disponible en `http://localhost:8000`.

Para el frontend en desarrollo:
```bash
cd frontend
npm install
npm run dev
```

### Migraciones
Las migraciones se aplican automáticamente al arrancar el contenedor del backend.

Para crear una nueva migración tras cambios en los modelos:
```bash
docker exec herdly_backend alembic revision --autogenerate -m "descripcion"
docker exec herdly_backend alembic upgrade head
```

---

## Roles y permisos

| Acción | Admin | Colaborador |
|---|---|---|
| Ver y gestionar animales | ✓ | ✓ |
| Registrar nacimientos, ventas, compras | ✓ | ✓ |
| Gestionar preñeces | ✓ | ✓ |
| Usar el asistente IA | ✓ | ✓ |
| Renombrar la ganadería | ✓ | — |
| Crear y revocar invitaciones | ✓ | — |
| Ver y expulsar miembros | ✓ | — |

---

## Privacidad y seguridad

- El registro está restringido por lista blanca de emails (`ALLOWED_EMAILS`)
- Las contraseñas se almacenan con bcrypt
- Todos los endpoints verifican que el usuario pertenece a la ganadería que consulta
- PostgreSQL no debe exponerse al exterior (sin mapeo de puerto `5432` en producción)
- En producción usar HTTPS (recomendado: Caddy como proxy inverso)

---

## Changelog

Los cambios relevantes se registran aquí al modificar funcionalidades existentes o añadir nuevas.

| Fecha | Cambio |
|---|---|
| 2026-06-12 | Versión inicial documentada. Migración del agente de Anthropic a Groq (OpenAI SDK). Lista blanca de emails para registro. |
