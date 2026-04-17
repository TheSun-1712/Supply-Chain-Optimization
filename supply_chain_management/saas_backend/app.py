from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .database.bootstrap import init_db, seed_reference_data
from .database.session import SessionLocal
from .routes.analytics import router as analytics_router
from .routes.decision import router as decision_router
from .routes.inventory import router as inventory_router
from .routes.orders import router as orders_router
from .routes.products import router as products_router
from .routes.simulations import router as simulations_router
from .routes.suppliers import router as suppliers_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed_reference_data(db)
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


app.include_router(products_router, prefix=settings.api_prefix)
app.include_router(suppliers_router, prefix=settings.api_prefix)
app.include_router(inventory_router, prefix=settings.api_prefix)
app.include_router(orders_router, prefix=settings.api_prefix)
app.include_router(decision_router, prefix=settings.api_prefix)
app.include_router(simulations_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)


def main() -> None:
    import uvicorn

    uvicorn.run("supply_chain_management.saas_backend.app:app", host="0.0.0.0", port=8000, reload=True)
