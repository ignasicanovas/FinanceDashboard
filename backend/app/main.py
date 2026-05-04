"""
main.py — FastAPI application factory.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core import auth as auth_module
from app.core import db as db_module
from app.routers import auth, accounts, upload, transactions, categories, areas, rules, kpis, stats, users, tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    # Propagar configuración a módulos dependientes
    os.environ.setdefault("GCS_BUCKET", settings.gcs_bucket)
    os.environ.setdefault("DB_BLOB", settings.db_blob)
    os.environ.setdefault("DB_LOCAL_CACHE_DIR", settings.db_local_cache_dir)
    auth_module.configure_jwt(
        settings.secret_key,
        settings.algorithm,
        settings.access_token_expire_minutes,
    )
    # Inicializar DB principal (descarga de GCS y crea tablas)
    db_module.get_main_connection()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="FinanceDashboard API",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api"
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["users"])
    app.include_router(accounts.router, prefix=f"{prefix}/accounts", tags=["accounts"])
    app.include_router(upload.router, prefix=f"{prefix}/accounts", tags=["upload"])
    app.include_router(transactions.router, prefix=f"{prefix}/accounts", tags=["transactions"])
    app.include_router(categories.router, prefix=f"{prefix}/accounts", tags=["categories"])
    app.include_router(areas.router, prefix=f"{prefix}/accounts", tags=["areas"])
    app.include_router(rules.router, prefix=f"{prefix}/accounts", tags=["rules"])
    app.include_router(kpis.router, prefix=f"{prefix}/accounts", tags=["kpis"])
    app.include_router(stats.router, prefix=f"{prefix}/accounts", tags=["stats"])
    app.include_router(tags.router, prefix=f"{prefix}/accounts", tags=["tags"])

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
