"""
crawler.py — Async aiohttp crawler.
Fetches pages, extracts backlinks pointing to target domain,
and discovers new URLs to enqueue.
"""
import asyncio
import logging
import random
from urllib.parse import urljoin

import aiohttp
from bs4 import BeautifulSoup

import db
from config import CONCURRENCY, MAX_DEPTH, REQUEST_TIMEOUT
from utils import (
    normalize_url,
    extract_domain,
    is_target_domain,
    get_next_user_agent,
)

logger = logging.getLogger(__name__)

# Semaphore limits concurrent requests across all tasks
_semaphore: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(CONCURRENCY)
    return _semaphore


async def fetch_page(session: aiohttp.ClientSession, url: str) -> str | None:
    """Fetch page HTML with timeout, user-agent rotation, and error handling"""
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    headers = {
        "User-Agent": get_next_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }
    try:
        async with get_semaphore():
            # Small random delay to avoid rate limiting
            await asyncio.sleep(random.uniform(0.1, 0.5))
            async with session.get(
                url,
                timeout=timeout,
                headers=headers,
                allow_redirects=True,
                ssl=False,  # Skip SSL verification for robustness
            ) as response:
                if response.status != 200:
                    return None
                # Only parse HTML content
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    return None
                return await response.text(errors="replace")
    except asyncio.TimeoutError:
        logger.debug(f"Timeout: {url}")
        return None
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {type(e).__name__}: {e}")
        return None


def extract_links(html: str, base_url: str) -> list[dict]:
    """
    Parse all <a href=""> links from HTML.
    Returns list of dicts: { url, anchor, nofollow }
    """
    links = []
    try:
        soup = BeautifulSoup(html, "lxml")
        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue

            # Resolve relative URLs
            abs_url = urljoin(base_url, href)
            normalized = normalize_url(abs_url)
            if not normalized:
                continue

            anchor = tag.get_text(separator=" ", strip=True)[:500]
            rel = tag.get("rel", [])
            nofollow = "nofollow" in rel if isinstance(rel, list) else "nofollow" in str(rel)

            links.append({
                "url": normalized,
                "anchor": anchor,
                "nofollow": nofollow,
            })
    except Exception as e:
        logger.debug(f"Error parsing links from {base_url}: {e}")
    return links


async def crawl_url(
    session: aiohttp.ClientSession,
    job: dict,
    project_id: str,
    target_domain: str,
    max_urls: int,
) -> None:
    """
    Crawl a single URL from the queue:
    1. Fetch the page
    2. Extract all links
    3. Save backlinks pointing to target domain
    4. Enqueue new discovered URLs (depth + 1)
    """
    url = job["url"]
    depth = job.get("depth", 0)
    retries = job.get("retries", 0)

    html = await fetch_page(session, url)

    if html is None:
        db.mark_job_failed(job["id"], retries)
        return

    links = extract_links(html, url)
    new_urls = []
    backlinks_to_save = []
    referrer_domain = extract_domain(url)

    for link in links:
        link_url = link["url"]

        if is_target_domain(link_url, target_domain):
            # Found a backlink!
            if referrer_domain and referrer_domain != target_domain \
                    and referrer_domain != f"www.{target_domain}":
                backlinks_to_save.append({
                    "source_url": url,
                    "target_url": link_url,
                    "anchor": link["anchor"][:500] if link["anchor"] else "",
                    "nofollow": link["nofollow"],
                    "domain": referrer_domain,
                })

                # ✅ NEW: also crawl more pages from this domain
                # Try to fetch their sitemap to find more pages that may link to us
                if depth < MAX_DEPTH:
                    sitemap_url = f"https://{referrer_domain}/sitemap.xml"
                    new_urls.append(sitemap_url)

        elif depth < MAX_DEPTH:
            new_urls.append(link_url)

    # Batch save all backlinks found on this page
    if backlinks_to_save:
        db.save_backlinks_batch(project_id, backlinks_to_save)

    # Enqueue newly discovered URLs
    if new_urls:
        db.enqueue_urls(project_id, new_urls, depth + 1, max_urls)

    db.mark_job_done(job["id"])
    logger.info(f"✓ Crawled {url} — {len(links)} links found")


async def crawl_project_batch(
    project: dict,
    batch_size: int = CONCURRENCY,
) -> int:
    project_id = project["id"]
    target_domain = project["domain"].replace("www.", "").lower()
    
    # ✅ FIX: use the config value, not hardcoded 5000
    from config import MAX_URLS_PER_PROJECT
    max_urls = MAX_URLS_PER_PROJECT

    jobs = []
    for _ in range(batch_size):
        job = db.claim_next_job(project_id)
        if not job:
            break
        jobs.append(job)

    if not jobs:
        return 0

    connector = aiohttp.TCPConnector(limit=CONCURRENCY, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            crawl_url(session, job, project_id, target_domain, max_urls)
            for job in jobs
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    logger.info(f"[{target_domain}] Processed batch of {len(jobs)} URLs")
    return len(jobs)