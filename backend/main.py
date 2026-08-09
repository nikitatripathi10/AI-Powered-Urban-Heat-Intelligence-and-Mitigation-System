"""
THERMA — Urban Heat Intelligence Platform
FastAPI backend entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import cities, optimization, scenarios, metrics, interventions

app = FastAPI(
    title="THERMA API",
    description="Urban Heat Mitigation Intelligence — backend API",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production nginx handles routing, so we only need broad CORS for local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(cities.router)
app.include_router(optimization.router)
app.include_router(scenarios.router)
app.include_router(metrics.router)
app.include_router(interventions.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "therma-backend"}


@app.get("/")
def root():
    return {"message": "THERMA API — see /docs for interactive API reference"}
