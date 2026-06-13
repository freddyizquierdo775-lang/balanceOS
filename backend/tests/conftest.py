"""Balance OS — Configuración de tests (pytest-asyncio)"""

import os
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.database import Base, get_db
from app.main import app
from app.config import SECRET_KEY, ALGORITHM
from app.models import Usuario, Cliente, Documento
from app.routers.auth import create_token, hash_password
from app.imss import calcular_cuotas, calcular_factor_integracion
from app.imss.types import DatosTrabajador

TEST_DB_URL = "sqlite+aiosqlite:///./test_balance_os.db"


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="module")
async def test_env():
    """Module-scoped: create DB + users + token once."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        admin = Usuario(
            nombre="Admin Test", email="admin@test.com",
            password_hash=hash_password("test123"), rol="admin",
        )
        asesor = Usuario(
            nombre="Asesor Test", email="asesor@test.com",
            password_hash=hash_password("test123"), rol="asesor",
        )
        session.add(admin)
        session.add(asesor)
        await session.commit()
        await session.refresh(admin)
        await session.refresh(asesor)
        admin_token = create_token({"sub": str(admin.id), "rol": admin.rol})
        asesor_token = create_token({"sub": str(asesor.id), "rol": asesor.rol})

    yield {
        "engine": engine,
        "session_factory": session_factory,
        "admin_token": admin_token,
        "admin_id": admin.id,
        "asesor_token": asesor_token,
        "asesor_id": asesor.id,
    }

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    try:
        os.remove("test_balance_os.db")
    except (PermissionError, FileNotFoundError):
        pass


@pytest_asyncio.fixture
async def client(test_env):
    """Function-scoped test client with fresh DB session override."""
    sf = test_env["session_factory"]

    async def override_get_db():
        async with sf() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
