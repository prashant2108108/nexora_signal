"""
db.py — Supabase client for the crawler worker.
Uses service role key (bypasses RLS).
"""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MAX_RETRIES
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def get_projects_to_crawl() -> list[dict]:
    client = get_client()
    result = client.table("backlink_projects") \
        .select("id, domain, status") \
        .in_("status", ["crawling", "discovering"]) \
        .execute()
    return result.data or []


def claim_next_job(project_id: str) -> dict | None:
    """
    Atomically claim a pending job using FOR UPDATE SKIP LOCKED.
    Safe for multiple concurrent workers.
    """
    client = get_client()
    try:
        result = client.rpc("claim_crawl_job", {"p_project_id": project_id}).execute()
        jobs = result.data
        return jobs[0] if jobs else None
    except Exception as e:
        logger.error(f"Error claiming job for project {project_id}: {e}")
        return None


def mark_job_done(job_id: str) -> None:
    get_client().table("crawl_queue") \
        .update({"status": "done"}) \
        .eq("id", job_id) \
        .execute()


def mark_job_failed(job_id: str, retries: int) -> None:
    client = get_client()
    new_retries = retries + 1
    if new_retries > MAX_RETRIES:
        client.table("crawl_queue") \
            .update({"status": "failed", "retries": new_retries}) \
            .eq("id", job_id) \
            .execute()
    else:
        client.table("crawl_queue") \
            .update({"status": "pending", "retries": new_retries}) \
            .eq("id", job_id) \
            .execute()


def get_queue_count(project_id: str, status: str | None = None) -> int:
    """Count URLs in queue for a project, optionally filtered by status"""
    query = get_client().table("crawl_queue") \
        .select("id", count="exact") \
        .eq("project_id", project_id)
    
    if status:
        query = query.eq("status", status)
        
    result = query.execute()
    return result.count or 0


def enqueue_urls(project_id: str, urls: list[str], depth: int, max_urls: int) -> int:
    """Bulk-insert new URLs into crawl_queue with deduplication via ON CONFLICT DO NOTHING"""
    current_count = get_queue_count(project_id)
    slots = max_urls - current_count
    if slots <= 0:
        return 0

    rows = [
        {"project_id": project_id, "url": url, "depth": depth, "status": "pending"}
        for url in urls[:slots]
    ]
    if not rows:
        return 0

    try:
        get_client().table("crawl_queue") \
            .upsert(rows, on_conflict="project_id,url", ignore_duplicates=True) \
            .execute()
        return len(rows)
    except Exception as e:
        logger.error(f"Error enqueuing URLs: {e}")
        return 0


def save_backlinks_batch(project_id: str, backlinks: list[dict]) -> None:
    """Save a list of backlinks in one batch via RPC"""
    if not backlinks:
        return
    try:
        get_client().rpc("upsert_backlinks_batch", {
            "p_project_id": project_id,
            "p_backlinks": backlinks,
        }).execute()
    except Exception as e:
        logger.error(f"Error saving batch of {len(backlinks)} backlinks for {project_id}: {e}")


def save_backlink(project_id: str, source_url: str, target_url: str,
                  anchor: str, nofollow: bool, domain: str) -> None:
    """Legacy single-save wrapper (calls batch)"""
    save_backlinks_batch(project_id, [{
        "source_url": source_url,
        "target_url": target_url,
        "anchor": anchor,
        "nofollow": nofollow,
        "domain": domain
    }])


def mark_project_done(project_id: str) -> None:
    get_client().table("backlink_projects") \
        .update({"status": "done"}) \
        .eq("id", project_id) \
        .execute()
