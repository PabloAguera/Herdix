"""
Fixtures compartidas para los tests.
Usa PostgreSQL (la misma instancia que Docker, BD separada: herdly_test_db).
Levanta el stack con: docker-compose up -d db
Luego ejecuta: pytest desde dentro del contenedor o con la BD expuesta.
"""
import itertools
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.database import Base, get_db
from app.main import app

# BD de test: misma instancia PostgreSQL, base de datos separada
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    f"/{settings.DATABASE_URL.rsplit('/', 1)[-1]}",
    "/herdly_test_db",
)

engine_test = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

# Contador para emails únicos por test
_counter = itertools.count(1)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Crea las tablas al inicio de la sesión y las elimina al final."""
    Base.metadata.drop_all(bind=engine_test)
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def usuario_y_token(client):
    """Crea un usuario de prueba con email único y devuelve sus datos + JWT."""
    n = next(_counter)
    payload = {
        "nombre": f"Test User {n}",
        "email": f"test{n}@herdly.es",
        "password": "test1234",
    }
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, resp.json()
    usuario = resp.json()

    login = client.post("/auth/login", json={
        "email": payload["email"],
        "password": payload["password"],
    })
    assert login.status_code == 200, login.json()
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return usuario, token, headers


@pytest.fixture()
def ganaderia(client, usuario_y_token):
    """Crea una ganadería de prueba para el usuario del fixture."""
    _, _, headers = usuario_y_token
    resp = client.post("/ganaderias/", json={"nombre": "Ganadería Test"}, headers=headers)
    assert resp.status_code == 201, resp.json()
    return resp.json()
