// Fetch helpers for the backlinks API routes

export interface BacklinkProject {
  id: string
  domain: string
  status: 'idle' | 'discovering' | 'crawling' | 'done' | 'failed'
  max_urls: number
  created_at: string
}

export interface Backlink {
  id: string
  project_id: string
  source_url: string
  target_url: string
  anchor: string
  nofollow: boolean
  domain: string
  created_at: string
}

export interface BacklinkAnalytics {
  domain: string
  totalBacklinks: number
  referringDomains: number
  dofollowCount: number
  nofollowCount: number
  dofollowRatio: number
  topDomains: Array<{ domain: string; backlink_count: number; dofollow_count: number; nofollow_count: number }>
  topAnchors: Array<{ anchor: string; count: number }>
  queueStats: Record<string, number>
}

export interface BacklinksResponse {
  backlinks: Backlink[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BacklinkFilters {
  nofollow?: 'true' | 'false'
  domain?: string
  anchor?: string
  page?: number
  limit?: number
}

export async function fetchProjects(): Promise<BacklinkProject[]> {
  const res = await fetch('/api/backlinks/projects')
  if (!res.ok) throw new Error('Failed to fetch projects')
  const data = await res.json()
  return data.projects
}

export async function createProject(domain: string): Promise<BacklinkProject> {
  const res = await fetch('/api/backlinks/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create project')
  return data.project
}

export async function fetchBacklinks(projectId: string, filters: BacklinkFilters = {}): Promise<BacklinksResponse> {
  const params = new URLSearchParams()
  if (filters.nofollow) params.set('nofollow', filters.nofollow)
  if (filters.domain) params.set('domain', filters.domain)
  if (filters.anchor) params.set('anchor', filters.anchor)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))

  const res = await fetch(`/api/backlinks/${projectId}?${params}`)
  if (!res.ok) throw new Error('Failed to fetch backlinks')
  return res.json()
}

export async function fetchAnalytics(projectId: string): Promise<BacklinkAnalytics> {
  const res = await fetch(`/api/backlinks/${projectId}/analytics`)
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

export async function triggerDiscover(projectId: string): Promise<{ queued: number }> {
  const res = await fetch(`/api/backlinks/${projectId}/discover`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Discovery failed')
  return data
}
export async function stopCrawl(projectId: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/backlinks/${projectId}/stop`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to stop crawl')
  return data
}
export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/backlinks/${projectId}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete project')
  return data
}
