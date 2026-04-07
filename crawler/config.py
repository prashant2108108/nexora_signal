import os
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Crawler settings
CONCURRENCY: int = int(os.getenv("CONCURRENCY", "50"))
MAX_DEPTH: int = int(os.getenv("MAX_DEPTH", "4"))
MAX_URLS_PER_PROJECT: int = int(os.getenv("MAX_URLS", "20000"))
REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "10"))
WORKER_SLEEP_SECONDS: float = float(os.getenv("WORKER_SLEEP", "2"))
MAX_RETRIES: int = 2

# API keys for discovery
SERPAPI_KEY: str = os.getenv("SERPAPI_KEY", "")  # ✅ load from env, never hardcode