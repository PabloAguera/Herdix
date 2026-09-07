#!/bin/sh
# Entrypoint de producción (Render u otro host Docker):
# 1. Aplica las migraciones de Alembic pendientes.
# 2. Arranca uvicorn en el puerto que indique la plataforma (variable PORT),
#    o 8000 si no está definida (uso local).
set -e

echo "Aplicando migraciones de base de datos..."
alembic upgrade head

echo "Arrancando servidor..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
