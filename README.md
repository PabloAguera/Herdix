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
- **Docker Compose** — Orquestación de servicios en local (PostgreSQL + Backend)
- **Groq API** — Inferencia LLM gratuita (modelo `openai/gpt-oss-120b`)
- **Vercel** — Hosting del frontend (build estático + PWA instalable)
- **Render** — Hosting del backend (contenedor Docker)
- **Neon** — PostgreSQL gestionado en la nube (capa gratuita)

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

### PWA (app instalable)
- El frontend es una **Progressive Web App**: se puede instalar en el móvil (Android/iOS) o en el escritorio directamente desde el navegador, sin pasar por una tienda de aplicaciones
- Una vez instalada, se abre a pantalla completa como una app nativa, sin barra de navegador
- Funciona offline para la carga inicial de la interfaz (los datos siempre requieren conexión, no se cachean)

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
herdix/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuración, seguridad, dependencias
│   │   ├── db/            # Conexión a base de datos
│   │   ├── models/        # Modelos SQLAlchemy
│   │   ├── routers/       # Endpoints API
│   │   └── schemas/       # Esquemas Pydantic
│   ├── alembic/           # Migraciones de base de datos
│   ├── entrypoint.sh      # Arranque en producción (migra + levanta uvicorn en $PORT)
│   └── requirements.txt
├── frontend/
│   ├── public/             # Iconos PWA, manifest, assets estáticos
│   ├── src/
│   │   ├── api/           # Clientes Axios por recurso
│   │   ├── components/    # Componentes reutilizables (layout + ui)
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── router/        # Definición de rutas
│   │   ├── stores/        # Stores Zustand
│   │   └── types/         # Tipos TypeScript
│   ├── vercel.json         # Fallback SPA para Vercel
│   └── package.json
├── docker-compose.yml
├── render.yaml             # Blueprint de despliegue del backend en Render
└── .env
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto (el mismo directorio que `docker-compose.yml`). **Importante:** `docker-compose.yml` interpola sus valores desde este `.env` de la raíz, no desde `backend/.env` — ambos deben mantenerse sincronizados si se usan los dos.

```env
# Base de datos
POSTGRES_USER=herdly
POSTGRES_PASSWORD=herdly_secret
POSTGRES_DB=herdly_db

# Seguridad JWT
SECRET_KEY=xxxxxxxxxxxxxxxxxxxx  # generar con: openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Groq API (gratuito en console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Emails con permiso para registrarse (separados por comas)
ALLOWED_EMAILS=tu@email.com,otro@email.com
```

Variables internas del backend (configuradas en `docker-compose.yml`, con valor por defecto si no están en el `.env`):

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | postgresql://herdly:herdly_secret@db/herdly_db | Conexión a PostgreSQL (compuesta a partir de `POSTGRES_USER/PASSWORD/DB`) |
| `SECRET_KEY` | (cambiar en producción) | Clave para firmar JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Expiración del token |
| `AGENTE_MODEL` | `openai/gpt-oss-120b` | Modelo LLM del agente (Groq retiró `llama-3.3-70b-versatile` el 17/06/2026) |
| `CORS_ORIGINS` | `https://herdix.vercel.app,http://localhost:5173` | Dominios permitidos para llamar a la API (separados por comas). Solo aplica en producción; en local se permite cualquier origen |

Variable del **frontend** (Vite, solo necesaria en producción):

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL completa del backend desplegado, ej. `https://herdix-backend.onrender.com`. En local no hace falta: se usa el proxy de Vite hacia `/api` |

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
docker exec herdix_backend alembic revision --autogenerate -m "descripcion"
docker exec herdix_backend alembic upgrade head
```

---

## Despliegue en producción

Stack pensado para la capa gratuita, dimensionado para ~70-100 usuarios totales y ~20 concurrentes en pico:

- **Neon** (PostgreSQL gestionado, capa gratuita permanente)
- **Render** (backend en Docker, capa gratuita — se "duerme" tras 15 min sin uso y tarda 30-60s en despertar en la siguiente petición)
- **Vercel** (frontend estático + PWA, capa gratuita)

### 1. Base de datos (Neon)
1. Crear cuenta en [neon.tech](https://neon.tech) y un proyecto nuevo.
2. Copiar la **connection string "pooled"** (no la directa) — Neon la muestra en el dashboard del proyecto.
3. Guardarla, se usará como `DATABASE_URL` en Render.

### 2. Backend (Render)
1. Crear cuenta en [render.com](https://render.com) y conectar el repositorio `PabloAguera/Herdix`.
2. Render detectará el `render.yaml` de la raíz del repo (Blueprint) y propondrá crear el servicio `herdix-backend` automáticamente. Si prefieres crearlo a mano: **New → Web Service**, runtime **Docker**, `dockerfilePath: backend/Dockerfile`, `dockerContext: backend`.
3. Rellenar las variables de entorno marcadas como manuales en el Blueprint (o en Settings → Environment si se crea a mano):
   - `DATABASE_URL` → la connection string pooled de Neon
   - `GROQ_API_KEY` → tu clave de [console.groq.com](https://console.groq.com)
   - `ALLOWED_EMAILS` → tus emails autorizados, separados por comas
   - `CORS_ORIGINS` → se rellena en el paso 4, una vez se conozca la URL de Vercel
   - `SECRET_KEY` se genera sola (`generateValue: true` en el Blueprint); si se crea a mano, generarla con `openssl rand -hex 32`
4. Al desplegar, Render asigna una URL tipo `https://herdix-backend.onrender.com`. Anotarla, se usará como `VITE_API_URL` en Vercel.

### 3. Frontend (Vercel)
1. Crear cuenta en [vercel.com](https://vercel.com) e importar el mismo repositorio.
2. En la configuración del proyecto, **Root Directory** → `frontend` (importante, si no Vercel intentará compilar el repo entero).
3. Añadir la variable de entorno `VITE_API_URL` con la URL de Render del paso anterior (ej. `https://herdix-backend.onrender.com`).
4. Desplegar. Vercel asigna una URL tipo `https://herdix.vercel.app`.

### 4. Cerrar el círculo (CORS)
Volver a Render y actualizar `CORS_ORIGINS` con la URL final de Vercel (ej. `https://herdix.vercel.app`), separando por comas si hay más de un dominio. Redesplegar el backend para que aplique el cambio.

### 5. Instalar como app en el móvil
Con el frontend desplegado en Vercel (HTTPS, requisito de las PWA):
- **Android (Chrome)**: menú ⋮ → "Instalar aplicación" o "Añadir a pantalla de inicio".
- **iOS (Safari)**: botón compartir → "Añadir a pantalla de inicio".

La app queda con su propio icono, se abre a pantalla completa y no requiere abrir el navegador manualmente.

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
| 2026-08-23 | Preparado el despliegue en producción (Vercel + Render + Neon): `entrypoint.sh` para aplicar migraciones y respetar el puerto dinámico de Render; `CORS_ORIGINS` configurable por variable de entorno en `main.py`; pool de conexiones a BD dimensionado para ~20 usuarios concurrentes (`pool_size=10, max_overflow=10`); `VITE_API_URL` para apuntar el frontend al backend desplegado; `vercel.json` con fallback SPA; `render.yaml` como Blueprint del backend. Añadido soporte **PWA** instalable (manifest, iconos, service worker vía `vite-plugin-pwa`) para poder instalar la app en el móvil sin pasar por el navegador. |
| 2026-08-23 | Cambiado el modelo por defecto del agente a `openai/gpt-oss-120b` (Groq retiró `llama-3.3-70b-versatile` el 17/06/2026, provocaba error 404 al chatear con el asistente). Añadida `AGENTE_MODEL` a `docker-compose.yml`. Corregido el `.env` de la raíz, que le faltaban `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL` y `SECRET_KEY` (causaba fallo de login al recrear los contenedores). Corregido el esquema de las herramientas del agente (`agente.py`) para aceptar `null` en parámetros opcionales — el nuevo modelo los envía explícitamente y Groq rechazaba la llamada con error 400 (`tool_use_failed`). Corregido también un fallo en `_hijos_de_animal` que rompía con `AttributeError` al recibir `null` en `crotal`/`nombre`. |
| 2026-06-12 | Versión inicial documentada. Migración del agente de Anthropic a Groq (OpenAI SDK). Lista blanca de emails para registro. |
