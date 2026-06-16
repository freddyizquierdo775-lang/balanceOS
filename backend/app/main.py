"""
Balance OS — Main Entry Point

Sirve API + frontend compilado (production mode).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os.path

from app.database import init_db
from app.routers import auth, clientes, documentos, imss, alertas, empleados, nomina, repse, pld, finiquitos, cfdi, portal
from app.routers import contabilidad, impuestos, facturacion, tesoreria, estados_financieros, api_publica, alertas_efos, crm, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Seed automático si la BD está vacía (primer deploy)
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("seed_module", os.path.join(os.path.dirname(__file__), "..", "seed.py"))
        if spec and spec.loader:
            seed_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(seed_module)
            await seed_module.seed()
    except Exception:
        pass  # seed no disponible, o ya ejecutado — no es crítico
    yield

app = FastAPI(
    title="Balance OS API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(documentos.router)
app.include_router(imss.router)
app.include_router(alertas.router)
app.include_router(empleados.router)
app.include_router(nomina.router)
app.include_router(repse.router)
app.include_router(pld.router)
app.include_router(finiquitos.router)
app.include_router(cfdi.router)
app.include_router(portal.router)
app.include_router(contabilidad.router)
app.include_router(impuestos.router)
app.include_router(facturacion.router)
app.include_router(tesoreria.router)
app.include_router(estados_financieros.router)
app.include_router(api_publica.router)
app.include_router(alertas_efos.router)
app.include_router(crm.router)
app.include_router(dashboard.router)


# ─── Health endpoint ──────────────────────────────
# Debe ir ANTES de la ruta catch-all del frontend


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# ─── Servir frontend compilado (producción) ──────

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "static")


def _frontend_path(path: str) -> str:
    """Devuelve la ruta absoluta a un archivo del frontend compilado."""
    return os.path.normpath(os.path.join(FRONTEND_DIR, path.lstrip("/")))


# En producción, servir assets estáticos
if os.path.isdir(FRONTEND_DIR):
    app.mount(
        "/assets",
        StaticFiles(directory=_frontend_path("assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Sirve el frontend SPA — cualquier ruta no-API devuelve index.html."""
        # No interceptar rutas de la API
        if full_path.startswith(("auth/", "clientes/", "empleados/",
                                  "nomina/", "imss/", "documentos/",
                                  "alertas/", "repse/", "pld/",
                                  "finiquitos/", "cfdi/", "portal/",
                                  "contabilidad/", "impuestos/",
                                  "facturacion/", "tesoreria/",
                                  "estados-financieros/", "api/",
                                  "alertas-efos/",
                                  "crm/",
                                  "dashboard/",
                                  "health")):
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        filepath = _frontend_path(full_path if full_path else "index.html")
        if os.path.isfile(filepath):
            return FileResponse(filepath)
        return FileResponse(_frontend_path("index.html"))
else:
    @app.on_event("startup")
    async def warn_no_frontend():
        print(f"⚠️  Frontend compilado no encontrado en {FRONTEND_DIR}")
        print("   Ejecuta: cd frontend && npm run build")

