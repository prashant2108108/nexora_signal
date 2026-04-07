# Nexora Backlink Crawler Worker

See `../backlinks_schema.sql` for the database schema.

## Local Development

```bash
cd crawler
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase credentials
python worker.py
```

## Environment Variables

Create a `.env` file in the `crawler/` directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CONCURRENCY=50
MAX_DEPTH=2
MAX_URLS=5000
REQUEST_TIMEOUT=10
WORKER_SLEEP=2
```

> ⚠️ Use the **service role key** (not the anon key). The anon key will fail due to RLS policies.

## Render Deployment

1. Push this repo to GitHub
2. In Render → **New → Background Worker**
3. **Root Directory:** `crawler`
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `python worker.py`
6. Add the env vars shown above in Render's Environment settings

## Architecture

```
crawl_queue (Supabase)
    ↓
claim_crawl_job() RPC  ← atomic, race-condition safe
    ↓
aiohttp async fetch (50 concurrent)
    ↓
BeautifulSoup link extraction
    ↓
upsert_backlink() RPC  ← deduplication handled in DB
    ↓
backlinks + backlink_domains tables
```
