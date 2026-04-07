"""
start.py — Railway entry point.

Runs the FastAPI HTTP server (on PORT env var, default 8080) and the
background crawler worker loop concurrently in the same process.

Railway start command:
    python start.py
"""
import asyncio
import logging
import os
import sys

import uvicorn

from api import app
from worker import main_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("start")

PORT = int(os.getenv("PORT", "8080"))


async def run_all():
    # Configure uvicorn to run inside the existing event loop
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        loop="none",          # use the current asyncio loop
    )
    server = uvicorn.Server(config)

    logger.info(f"🌐 API server starting on port {PORT}")
    logger.info("🚀 Crawler worker starting...")

    # Run API server + worker loop concurrently
    await asyncio.gather(
        server.serve(),
        main_loop(),
    )


if __name__ == "__main__":
    asyncio.run(run_all())
