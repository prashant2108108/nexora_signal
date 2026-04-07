"""
worker.py — Main worker entry point.
Polls Supabase for projects with pending crawl jobs,
processes them in batches, and loops infinitely.

Deploy on Render as a Background Worker:
  Build: pip install -r requirements.txt
  Start: python worker.py
"""
import asyncio
import logging
import time
import sys

import db
import os
from config import WORKER_SLEEP_SECONDS, CONCURRENCY, MAX_URLS_PER_PROJECT, SERPAPI_KEY, MAX_DEPTH
from crawler import crawl_project_batch
from discovery import discover_seeds

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("worker")



async def run_once() -> int:
    """Run one processing cycle across all active projects. Returns total jobs processed."""
    projects = db.get_projects_to_crawl()

    if not projects:
        return 0

    total_processed = 0
    for project in projects:
        try:
            if project["status"] == "discovering":
                logger.info(f"🔍 Starting discovery for {project['domain']}...")
                await discover_seeds(project["id"], project["domain"], max_urls=MAX_URLS_PER_PROJECT)
                # Flip to crawling once seeds are in
                db.get_client().table("backlink_projects").update({"status": "crawling"}).eq("id", project["id"]).execute()
                continue

            processed = await crawl_project_batch(project, batch_size=CONCURRENCY)
            total_processed += processed

            # If this batch returned fewer than requested, we might be hitting the end of the queue
            # Or if we just processed everything, check if we're done
            if processed < CONCURRENCY:
                # Double-check: are there ANY non-finished jobs left?
                # (pending or processing)
                if db.get_queue_count(project["id"], status="pending") == 0:
                    # Final check for stuck 'processing' jobs
                    if db.get_queue_count(project["id"], status="processing") == 0:
                        logger.info(f"✅ Project {project['domain']} crawl complete")
                        db.mark_project_done(project["id"])
        except Exception as e:
            logger.error(f"Error processing project {project.get('domain', '?')}: {e}")

    return total_processed


async def main_loop():
    logger.info(f"🚀 Nexora Backlink Crawler Worker started (concurrency={CONCURRENCY})")
    logger.info(f"🚀 Worker started — CONCURRENCY={CONCURRENCY}, MAX_DEPTH={MAX_DEPTH}, MAX_URLS={MAX_URLS_PER_PROJECT}")
    logger.info(f"🔑 SerpAPI key loaded: {'YES ✅' if SERPAPI_KEY else 'NO ❌ — Google discovery disabled'}")
    logger.info(f"🔑 Bing key: {'YES ✅' if os.getenv('BING_API_KEY') else 'not set (optional)'}")
    idle_cycles = 0

    while True:
        try:
            processed = await run_once()

            if processed > 0:
                idle_cycles = 0
                logger.info(f"🔄 Cycle done — processed {processed} URLs")
            else:
                idle_cycles += 1
                # Increase sleep when idle to reduce DB polling pressure (max 60s)
                sleep_time = min(WORKER_SLEEP_SECONDS * (1 + idle_cycles), 60)
                if idle_cycles % 10 == 1: # Only log occasionally when idle
                    logger.info(f"💤 No active projects or jobs, sleeping {sleep_time:.1f}s")
                await asyncio.sleep(sleep_time)
                continue

        except KeyboardInterrupt:
            logger.info("⛔ Worker interrupted by user")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")

        await asyncio.sleep(WORKER_SLEEP_SECONDS)


if __name__ == "__main__":
    asyncio.run(main_loop())
