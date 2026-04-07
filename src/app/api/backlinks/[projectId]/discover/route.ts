import { createClient } from '@/shared/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_URLS_PER_PROJECT = 5000

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return null
    u.search = ''
    u.hash = ''
    return u.href.replace(/\/$/, '') || u.href
  } catch {
    return null
  }
}

/** Strategy 1: CommonCrawl index — totally free, no auth, no scraping */
async function discoverViaCommonCrawl(domain: string): Promise<string[]> {
  const urls: string[] = []
  try {
    // Query the CommonCrawl index CDX API for pages that linked to this domain
    const query = encodeURIComponent(`*.${domain}`)
    const cdxUrl = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=${query}&output=json&limit=200&fl=url&filter=status:200`
    const res = await fetch(cdxUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': BROWSER_UA },
    })
    if (res.ok) {
      const text = await res.text()
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const obj = JSON.parse(line)
          if (obj.url) urls.push(obj.url)
        } catch { /* skip malformed */ }
      }
    }
  } catch { /* ignore timeout/network errors */ }
  return urls
}

/** Strategy 2: Try to find pages that mention the domain via DuckDuckGo lite (less blocked) */
async function discoverViaDuckDuckGo(domain: string): Promise<string[]> {
  const urls: string[] = []
  try {
    const query = encodeURIComponent(`"${domain}" -site:${domain}`)
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${query}`
    const res = await fetch(ddgUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (res.ok) {
      const html = await res.text()
      // DDG result links are in <a class="result__url" href="...">
      const matches = html.match(/href="(https?:\/\/[^"&]+)"/g) ?? []
      for (const m of matches) {
        const url = m.slice(6, -1)
        if (!url.includes('duckduckgo.com') && !url.includes('bing.com')) {
          urls.push(url)
        }
      }
    }
  } catch { /* ignore */ }
  return urls
}

/** Strategy 3: Parse sitemap.xml for the target domain's own URLs */
async function discoverViaSitemap(domain: string): Promise<string[]> {
  const urls: string[] = []
  const candidates = [
    `https://${domain}/sitemap.xml`,
    `https://www.${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/robots.txt`,
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': BROWSER_UA },
      })
      if (!res.ok) continue
      const text = await res.text()
      // If it's robots.txt, parse Sitemap: lines
      if (url.endsWith('robots.txt')) {
        const sitemapLines = text.match(/^Sitemap:\s*(.+)$/gim) ?? []
        for (const line of sitemapLines) {
          const sitemapUrl = line.replace(/^Sitemap:\s*/i, '').trim()
          urls.push(sitemapUrl)
        }
        continue
      }
      // Parse XML sitemap <loc> entries
      const locs = text.match(/<loc>([^<]+)<\/loc>/g) ?? []
      for (const loc of locs.slice(0, 300)) {
        const u = loc.replace(/<\/?loc>/g, '').trim()
        if (u.startsWith('http')) urls.push(u)
      }
      if (urls.length > 0) break
    } catch { /* ignore */ }
  }
  return urls
}

/** Strategy 4: Hard fallback — generates common high-authority pages that mention domains */
function generateFallbackSeeds(domain: string): string[] {
  // These are well-known sites likely to have backlinks about any domain
  const templateSites = [
    `https://www.reddit.com/search/?q=${encodeURIComponent(domain)}`,
    `https://news.ycombinator.com/search?q=${encodeURIComponent(domain)}`,
    `https://dev.to/search?q=${encodeURIComponent(domain)}`,
    `https://medium.com/search?q=${encodeURIComponent(domain)}`,
    `https://www.quora.com/search?q=${encodeURIComponent(domain)}`,
    `https://stackoverflow.com/search?q=${encodeURIComponent(domain)}`,
    `https://twitter.com/search?q=${encodeURIComponent(domain)}`,
    `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(domain)}`,
    `https://github.com/search?q=${encodeURIComponent(domain)}&type=code`,
    `https://web.archive.org/web/*/${domain}`,
  ]
  // Also add the domain itself and common subpages to crawl outbound links from
  const domainPages = [
    `https://${domain}`,
    `https://www.${domain}`,
    `https://${domain}/blog`,
    `https://${domain}/resources`,
    `https://${domain}/links`,
  ]
  return [...templateSites, ...domainPages]
}

async function discoverSeedUrls(domain: string): Promise<string[]> {
  const rawUrls = new Set<string>()

  // Run all discovery strategies in parallel
  const [ccUrls, ddgUrls, sitemapUrls] = await Promise.all([
    discoverViaCommonCrawl(domain),
    discoverViaDuckDuckGo(domain),
    discoverViaSitemap(domain),
  ])

  for (const url of [...ccUrls, ...ddgUrls, ...sitemapUrls]) {
    rawUrls.add(url)
  }

  // Always add fallback seeds so queue is never empty
  for (const url of generateFallbackSeeds(domain)) {
    rawUrls.add(url)
  }

  // Normalize all URLs
  const normalized = new Set<string>()
  for (const url of rawUrls) {
    const clean = normalizeUrl(url)
    if (clean) normalized.add(clean)
  }

  return Array.from(normalized).slice(0, 500)
}


// ── Railway worker ping helper ─────────────────────────────────────────────
const RAILWAY_WORKER_URL = process.env.RAILWAY_WORKER_URL // e.g. https://nexorasignal-production.up.railway.app
const WORKER_API_KEY = process.env.WORKER_API_KEY         // shared secret (optional)

async function pingWorker(projectId: string): Promise<void> {
  if (!RAILWAY_WORKER_URL) return // not configured → worker uses DB polling only
  try {
    const res = await fetch(`${RAILWAY_WORKER_URL}/trigger/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_API_KEY ? { 'x-api-key': WORKER_API_KEY } : {}),
      },
      signal: AbortSignal.timeout(5000), // don't block the response
    })
    if (!res.ok) {
      console.warn(`[discover] Worker ping returned ${res.status}`)
    }
  } catch (err) {
    // Fire-and-forget: never fail the user request if worker is unreachable
    console.warn('[discover] Could not ping Railway worker:', err)
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params

  // Verify project belongs to user
  const { data: project } = await supabase
    .from('backlink_projects')
    .select('id, domain')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // 1. Mark project as discovering — Python worker will pick this up and run advanced discovery (SerpAPI/Bing)
  await supabase
    .from('backlink_projects')
    .update({ status: 'discovering', updated_at: new Date().toISOString() })
    .eq('id', projectId)

  // 2. Add "instant" seeds for immediate results while worker starts
  const clean = project.domain.replace('www.', '').toLowerCase()
  const instantSeeds = [
    `https://${project.domain}`,
    `https://www.${project.domain}`,
    `https://www.reddit.com/search/?q=${encodeURIComponent(clean)}&sort=new`,
    `https://news.ycombinator.com/search?q=${encodeURIComponent(clean)}`,
    `https://html.duckduckgo.com/html/?q="${clean}" -site:${clean}`,
    `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${clean}&output=json`,
  ]

  const rows = instantSeeds.map(url => ({
    project_id: projectId,
    url,
    depth: 0,
    status: 'pending'
  }))

  await supabase
    .from('crawl_queue')
    .upsert(rows, { onConflict: 'project_id,url', ignoreDuplicates: true })

  // 3. Ping the Railway worker to skip the poll-cycle delay (fire-and-forget)
  void pingWorker(projectId)

  return NextResponse.json({ success: true, status: 'discovering', seeded: rows.length })
}
