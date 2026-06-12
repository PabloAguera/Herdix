#!/bin/bash
# Crea la base de datos de tests automáticamente al levantar el contenedor.
# PostgreSQL ejecuta los scripts de /docker-entrypoint-initdb.d/ en el primer arranque.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE herdly_test_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'herdly_test_db')\gexec
    GRANT ALL PRIVILEGES ON DATABASE herdly_test_db TO $POSTGRES_USER;
EOSQL
