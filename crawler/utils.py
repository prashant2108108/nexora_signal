import re
from urllib.parse import urlparse, urlunparse
import tldextract

# Rotate through these to avoid blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36",
]

# File extensions to skip (not web pages)
SKIP_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.avi',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
}

_ua_index = 0

def get_next_user_agent() -> str:
    global _ua_index
    ua = USER_AGENTS[_ua_index % len(USER_AGENTS)]
    _ua_index += 1
    return ua


def normalize_url(url: str) -> str | None:
    """
    Normalize a URL:
    - Strip query params and fragments
    - Remove trailing slashes
    - Lowercase scheme and host
    - Skip non-http(s) and skip known static extensions
    """
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ('http', 'https'):
            return None

        # Skip static resources
        path = parsed.path.lower()
        for ext in SKIP_EXTENSIONS:
            if path.endswith(ext):
                return None

        # Reconstruct without query/fragment
        clean = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path.rstrip('/') or '/',
            '',   # params
            '',   # query stripped
            '',   # fragment stripped
        ))
        return clean
    except Exception:
        return None


def extract_domain(url: str) -> str | None:
    """Extract registered domain using tldextract (e.g. 'blog.example.com' → 'example.com')"""
    try:
        ext = tldextract.extract(url)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}".lower()
        return None
    except Exception:
        return None


def is_target_domain(url: str, target_domain: str) -> bool:
    """Check if the URL belongs to the target domain (including subdomains)"""
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower().replace('www.', '')
        return host == target_domain or host.endswith(f'.{target_domain}')
    except Exception:
        return False
