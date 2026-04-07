"""
discovery.py — Upgraded seed discovery engine.
"""
import logging
import aiohttp
from urllib.parse import quote_plus
import db
from config import SERPAPI_KEY, MAX_URLS_PER_PROJECT

logger = logging.getLogger(__name__)


async def _serpapi_search(session: aiohttp.ClientSession, query: str, page: int = 0) -> list[str]:
    """Call SerpAPI and return result URLs. page=0,1,2... for pagination."""
    if not SERPAPI_KEY:
        logger.warning("SERPAPI_KEY not set — skipping Google discovery")
        return []
    try:
        params = {
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": 10,
            "start": page * 10,  # pagination
            "engine": "google",
        }
        async with session.get(
            "https://serpapi.com/search",
            params=params,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status != 200:
                logger.warning(f"SerpAPI returned {r.status} for query: {query}")
                return []
            data = await r.json()
            results = [
                result["link"]
                for result in data.get("organic_results", [])
                if "link" in result
            ]
            logger.info(f"SerpAPI [{query[:40]}] page {page}: {len(results)} results")
            return results
    except Exception as e:
        logger.warning(f"SerpAPI error: {e}")
        return []


async def _bing_search(session: aiohttp.ClientSession, query: str) -> list[str]:
    """Bing Web Search API — set BING_API_KEY in env to enable."""
    import os
    key = os.getenv("BING_API_KEY", "")
    if not key:
        return []
    try:
        async with session.get(
            "https://api.bing.microsoft.com/v7.0/search",
            headers={"Ocp-Apim-Subscription-Key": key},
            params={"q": query, "count": 50},  # Bing allows up to 50
            timeout=aiohttp.ClientTimeout(total=10),
        ) as r:
            data = await r.json()
            urls = [v["url"] for v in data.get("webPages", {}).get("value", [])]
            logger.info(f"Bing [{query[:40]}]: {len(urls)} results")
            return urls
    except Exception as e:
        logger.warning(f"Bing error: {e}")
        return []


async def _commoncrawl_discover(session: aiohttp.ClientSession, domain: str) -> list[str]:
    """
    Query CommonCrawl CDX API for pages that CONTAIN your domain in their content.
    Note: CDX doesn't do link-graph queries — we use it to find pages that
    mentioned your domain (by searching for URLs containing your domain).
    """
    urls = []
    # Search for pages that have your domain in their URL path (inbound links from other crawled pages)
    indexes = ["CC-MAIN-2024-10", "CC-MAIN-2023-50", "CC-MAIN-2023-23"]
    for index in indexes:
        try:
            cdx_url = (
                f"https://index.commoncrawl.org/{index}-index"
                f"?url=*{domain}*&output=json&limit=100&filter=status:200"
            )
            async with session.get(cdx_url, timeout=aiohttp.ClientTimeout(total=15)) as r:
                if not r.ok:
                    continue
                text = await r.text()
                for line in text.strip().split("\n"):
                    if not line:
                        continue
                    try:
                        import json
                        obj = json.loads(line)
                        if obj.get("url"):
                            urls.append(obj["url"])
                    except Exception:
                        pass
            logger.info(f"CommonCrawl [{index}]: {len(urls)} URLs so far")
        except Exception as e:
            logger.warning(f"CommonCrawl error for {index}: {e}")
    return urls


def _forum_seeds(domain: str) -> list[str]:
    """Direct search pages on high-authority sites."""
    enc = quote_plus(domain)
    return [
        f"https://www.reddit.com/search/?q={enc}&sort=new",
        f"https://www.reddit.com/search/?q={enc}&sort=relevance",
        f"https://news.ycombinator.com/search?q={enc}",
        f"https://dev.to/search?q={enc}",
        f"https://medium.com/search?q={enc}",
        f"https://stackoverflow.com/search?q={enc}",
        f"https://www.quora.com/search?q={enc}",
        f"https://hashnode.com/search?q={enc}",
        f"https://lobste.rs/search?q={enc}&what=stories",
        f"https://github.com/search?q={enc}&type=code",
        f"https://web.archive.org/web/*/{domain}",
    ]


def _ddg_seeds(domain: str) -> list[str]:
    """DuckDuckGo HTML pages — free, no API key, moderate results."""
    enc_exact = quote_plus(f'"{domain}" -site:{domain}')
    enc_www = quote_plus(f'"www.{domain}" -site:{domain}')
    return [
        f"https://html.duckduckgo.com/html/?q={enc_exact}",
        f"https://html.duckduckgo.com/html/?q={enc_exact}&s=30",
        f"https://html.duckduckgo.com/html/?q={enc_exact}&s=60",
        f"https://html.duckduckgo.com/html/?q={enc_www}",
    ]


async def discover_seeds(project_id: str, domain: str, max_urls: int = MAX_URLS_PER_PROJECT) -> int:
    """
    Main discovery function — runs multiple strategies in parallel.
    Called once per project from worker.py when status == 'discovering'.
    """
    clean = domain.replace("www.", "").lower()
    all_urls: list[str] = []

    async with aiohttp.ClientSession() as session:

        # === Google via SerpAPI — run MULTIPLE queries for volume ===
        serpapi_queries = [
            f'"{clean}" -site:{clean}',           # exact domain mention, exclude self
            f'"www.{clean}" -site:{clean}',        # www variant
            f'link:{clean}',                       # Google link: operator (limited but useful)
            f'"{clean}"',                          # broader mention without exclusion
        ]
        for i, query in enumerate(serpapi_queries):
            # Page 0 and 1 for each query = up to 80 Google results total
            for page in range(2):
                results = await _serpapi_search(session, query, page=page)
                all_urls.extend(results)
                if not results:
                    break  # no more pages

        # === Bing ===
        bing_results = await _bing_search(session, f'"{clean}" -site:{clean}')
        all_urls.extend(bing_results)

        # === CommonCrawl ===
        cc_results = await _commoncrawl_discover(session, clean)
        all_urls.extend(cc_results)

        # === Static seeds (always added regardless of API keys) ===
        all_urls.extend(_forum_seeds(clean))
        all_urls.extend(_ddg_seeds(clean))

    # Deduplicate preserving order
    seen: set[str] = set()
    unique_urls = [u for u in all_urls if u not in seen and not seen.add(u)]  # type: ignore

    logger.info(f"[{clean}] Discovery complete: {len(unique_urls)} unique seed URLs")

    count = db.enqueue_urls(project_id, unique_urls, depth=0, max_urls=max_urls)
    logger.info(f"[{clean}] Enqueued {count} seeds into crawl queue")
    return count