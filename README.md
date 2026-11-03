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
- **httpx** — Envío de correos con la API de Brevo
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
- **Brevo** — Envío de correos transaccionales (capa gratuita, 300 correos/día)

---

## Funcionalidades implementadas

### Autenticación y usuarios
- **Registro abierto con verificación de email**: cualquiera puede crear su cuenta, pero no puede entrar hasta pulsar el enlace que recibe por correo (caduca en 48 h, se puede reenviar desde el login)
- Login con email y contraseña, token JWT (el email no distingue mayúsculas)
- **Recuperar contraseña**: "¿La has olvidado?" envía un enlace de un solo uso que caduca en 30 minutos
- **Cambiar contraseña** desde Ajustes → Tu cuenta
- Al cambiar o restablecer la contraseña **se cierran las sesiones abiertas en el resto de dispositivos** (`token_version` dentro del JWT)
- **Límite de intentos** en login (5 por email cada 5 min), registro y envío de correos, contra fuerza bruta y spam
- Los enlaces de los correos se guardan solo como hash SHA-256 en la BD, y las respuestas de "olvidé mi contraseña" son idénticas exista o no la cuenta
- Roles por ganadería: **admin** y **colaborador**
- Sistema de invitaciones mediante enlace: el admin genera un enlace `/invitacion/<token>`; quien lo abre se une a la ganadería como colaborador. Si aún no tiene cuenta, se le lleva al registro y la invitación se aplica sola al confirmar el correo
- Un usuario puede pertenecer a varias ganaderías con roles distintos en cada una

### Gestión de ganaderías
- Crear ganaderías de tipo **bovino** o **equino**
- Renombrar (solo admin)
- Listar miembros y expulsar colaboradores (solo admin)
- Generar y revocar enlaces de invitación (solo admin)

### Censo de animales
- Alta, edición y baja de animales en el censo activo
- Campos: crotal, nombre, sexo, rol (madre / padre / recría), fecha de nacimiento, composición racial
- **Crotal provisional**: si al nacer aún no se tiene el crotal de la Consejería, se asigna un identificador `PROV-XXXXXXXX` y el animal aparece como pendiente hasta que se ponga el oficial
- **Cambio de crotal**: cada animal admite **un cambio de crotal, sin plazo** (normalmente provisional → oficial). Después queda fijo para los colaboradores; el **admin** de la ganadería puede corregirlo siempre (p. ej. una errata), confirmándolo antes de guardar. Al cambiarlo se actualizan genealogía, nacimientos, preñeces, compras y ventas
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

### Gastos
- Página **Gastos** en el menú, con pestañas: **Resumen**, **Alimentación**, **Veterinario**, **Fincas** y **Otros**
- Cada gasto tiene fecha, tipo, vendedor (o veterinario), precio y notas
  - Alimentación: Pienso, Tacos, Forraje, Paja, Rollos, Otros
  - Veterinario: Medicamentos, Inseminación, Partos, Herraje, Otros
  - Fincas: Abonos, Herbicidas, Semillas, Cal, Otros
  - Otros: tipo libre (gasóleo, seguros, reparaciones…), con sugerencias de los ya usados
- En cada categoría: total del año, desglose por tipo y lista de gastos (editar y borrar)
- **Resumen**: gasto de cada año por categoría y total, con gráfico de barras; pulsando una cifra se abre esa categoría y año
- Vendedores con autocompletado a partir de los ya usados
- Los tipos fijos están en `backend/app/models/gasto.py` y `frontend/src/lib/gastos.ts` (añadir uno no necesita migración)

### Dashboard
- Total de animales en censo activo
- Nacimientos y ventas del año en curso
- Preñeces activas
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
- El agente dispone de **10 herramientas** para consultar la base de datos en tiempo real:
  - `estadisticas_ganaderia` — Resumen estadístico del censo
  - `listar_animales` — Filtros por sexo, rol, raza o nombre
  - `detalle_animal` — Ficha completa de un animal por crotal
  - `listar_nacimientos` — Nacimientos con filtros por año, sexo o madre
  - `hijos_de_animal` — Crías de un animal con datos de venta si aplica
  - `listar_salidas` — Historial de salidas por año o motivo
  - `listar_compras` — Compras por año
  - `listar_ventas` — Ventas con comprador, precio y destino
  - `listar_prenyeces` — Preñeces activas con días para el parto
  - `resumen_gastos` — Gastos por año, categoría, tipo o vendedor (p. ej. "¿cuánto gasté en pienso este año?")
- Responde en español usando nombres de animales como identificador principal
- Historial de conversaciones persistente por ganadería (localStorage)
- **Dictado por voz**: se puede preguntar hablando en vez de escribir (reconocimiento de voz nativo del navegador, sin backend ni claves adicionales; funciona en Chrome/Edge y navegadores basados en Chromium, incluido Android)

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

# URL del frontend (para los enlaces de los correos)
FRONTEND_URL=http://localhost:5173

# Correo (Brevo). Vacío en local: los correos salen en el log del backend
BREVO_API_KEY=
EMAIL_REMITENTE=tu@email.com
```

En local no hace falta configurar Brevo: el contenido de cada correo (con su enlace de verificación o de restablecer contraseña) se escribe en el log del backend (`docker logs herdix_backend`).

Variables internas del backend (configuradas en `docker-compose.yml`, con valor por defecto si no están en el `.env`):

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | postgresql://herdly:herdly_secret@db/herdly_db | Conexión a PostgreSQL (compuesta a partir de `POSTGRES_USER/PASSWORD/DB`) |
| `SECRET_KEY` | (cambiar en producción) | Clave para firmar JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Expiración del token |
| `AGENTE_MODEL` | `openai/gpt-oss-120b` | Modelo LLM del agente (Groq retiró `llama-3.3-70b-versatile` el 17/06/2026) |
| `FRONTEND_URL` | `http://localhost:5173` | URL pública del frontend, para construir los enlaces de los correos |
| `BREVO_API_KEY` | (vacía) | Clave de la API de Brevo. Si está vacía, los correos no se envían y se escriben en el log |
| `EMAIL_REMITENTE` / `EMAIL_REMITENTE_NOMBRE` | — / `Herdix` | Remitente de los correos (debe estar verificado en Brevo) |
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
   - `BREVO_API_KEY` y `EMAIL_REMITENTE` → ver paso 2b
   - `FRONTEND_URL` → la URL de Vercel (paso 3), p. ej. `https://herdix.vercel.app`
   - `CORS_ORIGINS` → se rellena en el paso 4, una vez se conozca la URL de Vercel
   - `SECRET_KEY` se genera sola (`generateValue: true` en el Blueprint); si se crea a mano, generarla con `openssl rand -hex 32`
4. Al desplegar, Render asigna una URL tipo `https://herdix-backend.onrender.com`. Anotarla, se usará como `VITE_API_URL` en Vercel.

### 2b. Correo (Brevo)
Se usa la API HTTP de Brevo y no SMTP porque el plan gratuito de Render bloquea los puertos SMTP salientes.
1. Crear cuenta gratuita en [brevo.com](https://www.brevo.com).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: añadir el email remitente (p. ej. tu Gmail) y confirmarlo desde el correo que envía Brevo.
3. **SMTP & API → API Keys → Generate a new API key**.
4. En Render: `BREVO_API_KEY` = la clave, `EMAIL_REMITENTE` = el email verificado.

Brevo caduca las claves tras **90 días sin uso**. Para evitarlo, el backend hace una llamada de comprobación a Brevo cada vez que arranca (en Render arranca cada vez que alguien abre la app tras estar dormida), así que la clave se mantiene activa mientras la app se use, aunque nadie se registre ni recupere la contraseña. En los logs de Render aparece al arrancar `Clave de Brevo válida` o, si algo falla, `La clave de Brevo no es válida o ha caducado` con instrucciones.

Con un remitente `@gmail.com` algunos correos pueden acabar en spam. Si en el futuro se compra un dominio propio, verificarlo en Brevo (registros DKIM/DMARC) y usar un remitente tipo `no-responder@tudominio.es` lo soluciona.

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
| Ver y registrar gastos | ✓ | ✓ |
| Gestionar preñeces | ✓ | ✓ |
| Usar el asistente IA | ✓ | ✓ |
| Cambiar el crotal de un animal (una vez) | ✓ | ✓ |
| Corregir un crotal ya cambiado | ✓ | — |
| Renombrar la ganadería | ✓ | — |
| Crear y revocar invitaciones | ✓ | — |
| Ver y expulsar miembros | ✓ | — |

---

## Privacidad y seguridad

- Registro abierto, pero solo se puede entrar tras verificar el email
- Las contraseñas se almacenan con bcrypt; los tokens de los enlaces por correo, como hash SHA-256
- Límite de intentos en login, registro y recuperación de contraseña
- Cambiar o restablecer la contraseña invalida todas las sesiones abiertas
- Todos los endpoints verifican que el usuario pertenece a la ganadería que consulta
- PostgreSQL no debe exponerse al exterior (sin mapeo de puerto `5432` en producción)
- En producción usar HTTPS (recomendado: Caddy como proxy inverso)

---

## Changelog

Los cambios relevantes se registran aquí al modificar funcionalidades existentes o añadir nuevas.

| Fecha | Cambio |
|---|---|
| 2026-11-03 | **Nueva página Gastos.** Tabla `gastos` (migración `c9d0e1f2a3b4`) con categoría (alimentación, veterinario, fincas, otros), tipo, vendedor, precio, fecha y notas. Endpoints `/ganaderias/{id}/gastos` (listar con filtros de año y categoría, crear, editar, borrar), `/gastos/resumen` (totales por año y categoría) y `/gastos/sugerencias` (vendedores y tipos más usados). Página con pestañas Resumen + 4 categorías, desglose por tipo, gráfico anual apilado sin librerías nuevas y vista de tarjetas en móvil. Nueva herramienta del asistente `resumen_gastos`. Visible para todos los miembros de la ganadería. |
| 2026-11-03 | **Crotal: un cambio por animal, sin plazo.** Sustituye el plazo de 60 días desde el alta (`CROTAL_PLAZO_EDICION_DIAS`, eliminada), que no encajaba con todas las especies (en equino la identificación oficial puede tardar meses). Nueva columna `crotal_cambiado` (migración `b8c9d0e1f2a3`); todos los animales existentes empiezan con su cambio disponible, incluidos los anteriores a la función de crotal provisional. El admin puede corregir siempre, con casilla de confirmación. `GanaderiaRead` incluye ahora `mi_rol` (rol del usuario actual) para que el frontend sepa si es admin. |
| 2026-11-03 | **Cuentas y acceso.** Eliminada la lista blanca `ALLOWED_EMAILS`: registro abierto con verificación de email obligatoria (los usuarios existentes quedan verificados en la migración `a7b8c9d0e1f2`). Nuevas pantallas: recuperar contraseña, restablecer contraseña, confirmar correo y cambiar contraseña en Ajustes; botón para ver la contraseña al escribirla. `token_version` en el JWT para cerrar sesiones al cambiar la contraseña. Límite de intentos en memoria (`core/rate_limit.py`) y `--proxy-headers` en `entrypoint.sh` para ver la IP real tras el proxy de Render. Envío de correos con la API de Brevo (`services/email.py`; en local se escriben en el log). Corregido: los enlaces de invitación `/invitacion/<token>` no funcionaban (el router los redirigía al inicio y se perdía el token); ahora llevan al registro/login y la invitación se aplica sola. Corregido: con contraseña incorrecta la página de login se recargaba y no se veía el error (el interceptor de 401 actuaba también sobre `/auth/login`). El asistente IA muestra un mensaje claro cuando se agota la cuota de Groq en vez de un error genérico. Añadido `CompraAnio` a `models/__init__.py` (sin él, `alembic --autogenerate` proponía borrar la tabla de compras). Comprobación de la clave de Brevo al arrancar (evita que caduque por inactividad y avisa en el log si no es válida). Tests nuevos: `test_auth_cuenta.py`, `test_agente.py`, `test_email.py`. |
| 2026-09-21 | Quitada la tarjeta "Ingresos" del dashboard de inicio: mostraba la suma de ventas de todos los años en vez de solo el año en curso, pese a que tanto la query del backend como la petición del frontend ya filtraban por `anio`. Se probaron varios ajustes en el filtrado sin que el problema se reprodujera de forma consistente; sospecha sin confirmar: registros huérfanos en `ventas_anio` que quedan al borrar una venta desde el historial (`eliminar_historial` no limpia su `VentaAnio` asociada). La tarjeta "Ventas {año}" (contador) se mantiene, ya que esa sí mostraba el número correcto. Pendiente: revisar los datos de `ventas_anio` en producción y, si procede, limpiar los huérfanos al borrar del historial antes de reintroducir el importe. |
| 2026-09-18 | Añadido dictado por voz al asistente IA: botón de micrófono en el chat que transcribe la voz a texto usando la Web Speech API nativa del navegador (`use-speech-recognition.ts`), sin necesidad de backend ni servicios externos. Disponible en Chrome, Edge y navegadores basados en Chromium (incluido Chrome para Android); se avisa cuando el navegador no lo soporta o se deniega el permiso del micrófono. |
| 2026-08-23 | Preparado el despliegue en producción (Vercel + Render + Neon): `entrypoint.sh` para aplicar migraciones y respetar el puerto dinámico de Render; `CORS_ORIGINS` configurable por variable de entorno en `main.py`; pool de conexiones a BD dimensionado para ~20 usuarios concurrentes (`pool_size=10, max_overflow=10`); `VITE_API_URL` para apuntar el frontend al backend desplegado; `vercel.json` con fallback SPA; `render.yaml` como Blueprint del backend. Añadido soporte **PWA** instalable (manifest, iconos, service worker vía `vite-plugin-pwa`) para poder instalar la app en el móvil sin pasar por el navegador. |
| 2026-08-23 | Cambiado el modelo por defecto del agente a `openai/gpt-oss-120b` (Groq retiró `llama-3.3-70b-versatile` el 17/06/2026, provocaba error 404 al chatear con el asistente). Añadida `AGENTE_MODEL` a `docker-compose.yml`. Corregido el `.env` de la raíz, que le faltaban `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL` y `SECRET_KEY` (causaba fallo de login al recrear los contenedores). Corregido el esquema de las herramientas del agente (`agente.py`) para aceptar `null` en parámetros opcionales — el nuevo modelo los envía explícitamente y Groq rechazaba la llamada con error 400 (`tool_use_failed`). Corregido también un fallo en `_hijos_de_animal` que rompía con `AttributeError` al recibir `null` en `crotal`/`nombre`. |
| 2026-06-12 | Versión inicial documentada. Migración del agente de Anthropic a Groq (OpenAI SDK). Lista blanca de emails para registro. |
