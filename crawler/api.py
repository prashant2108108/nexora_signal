"""
api.py — FastAPI HTTP server for the Nexora crawler worker.

Exposes HTTP endpoints so Next.js (Vercel) can trigger/wake the worker,
check health, and notify it to start crawling immediately.

Run alongside worker.py in the same Railway process via start.py.
"""
import asyncio
import logging
import os
import threading

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import db

logger = logging.getLogger("api")

app = FastAPI(title="Nexora Crawler API", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow your Vercel frontend. Add localhost for local dev.
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://nexorasignal-production.up.railway.app",  # fallback (same domain)
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to ALLOWED_ORIGINS in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Simple API-key guard ───────────────────────────────────────────────────────
WORKER_API_KEY = os.getenv("WORKER_API_KEY", "")   # set this in Railway env vars


def _require_auth(request: Request) -> None:
    if not WORKER_API_KEY:
        return  # no key configured → open (dev mode)
    key = request.headers.get("x-api-key", "")
    if key != WORKER_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health-check — Railway and Next.js can ping this."""
    return {"status": "ok", "service": "nexora-crawler"}


@app.post("/wake")
async def wake(request: Request):
    """
    Called by Next.js after inserting a new job to skip the poll delay.
    The worker loop already runs continuously; this just confirms it's alive.
    """
    _require_auth(request)
    return JSONResponse({"status": "awake", "message": "Worker is running"})


@app.post("/trigger/{project_id}")
async def trigger_project(project_id: str, request: Request):
    """
    On-demand trigger for a specific project.
    Next.js calls this after marking a project as 'discovering' so the worker
    picks it up in the next cycle without waiting for the poll interval.
    """
    _require_auth(request)

    # Verify the project exists in Supabase
    try:
        result = (
            db.get_client()
            .table("backlink_projects")
            .select("id, domain, status")
            .eq("id", project_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project = result.data
    return JSONResponse({
        "status": "triggered",
        "project_id": project_id,
        "domain": project["domain"],
        "current_status": project["status"],
        "message": "Worker will process this project in the next cycle",
    })


@app.get("/status/{project_id}")
async def project_status(project_id: str, request: Request):
    """Return the current crawl status of a project."""
    _require_auth(request)

    try:
        result = (
            db.get_client()
            .table("backlink_projects")
            .select("id, domain, status, updated_at")
            .eq("id", project_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return JSONResponse(result.data)
