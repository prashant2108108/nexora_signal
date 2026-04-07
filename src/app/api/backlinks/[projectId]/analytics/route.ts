import { createClient } from '@/shared/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
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

  // Run analytics queries in parallel
  const [backlinksResult, domainsResult, anchorsResult, queueResult] = await Promise.all([
    // Total backlinks & dofollow/nofollow counts
    supabase
      .from('backlinks')
      .select('nofollow', { count: 'exact' })
      .eq('project_id', projectId),

    // Referring domains count + top domains
    supabase
      .from('backlink_domains')
      .select('domain, backlink_count, dofollow_count, nofollow_count')
      .eq('project_id', projectId)
      .order('backlink_count', { ascending: false })
      .limit(10),

    // Top anchor texts
    supabase
      .from('backlinks')
      .select('anchor')
      .eq('project_id', projectId)
      .not('anchor', 'is', null)
      .neq('anchor', ''),

    // Queue stats
    supabase
      .from('crawl_queue')
      .select('status', { count: 'exact' })
      .eq('project_id', projectId),
  ])

  const allBacklinks = backlinksResult.data ?? []
  const totalBacklinks = backlinksResult.count ?? 0
  const dofollowCount = allBacklinks.filter((b: { nofollow: boolean }) => !b.nofollow).length
  const nofollowCount = allBacklinks.filter((b: { nofollow: boolean }) => b.nofollow).length

  // Anchor frequency map
  const anchorMap: Record<string, number> = {}
  for (const { anchor } of anchorsResult.data ?? []) {
    if (anchor) anchorMap[anchor] = (anchorMap[anchor] ?? 0) + 1
  }
  const topAnchors = Object.entries(anchorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([anchor, count]) => ({ anchor, count }))

  // Queue status breakdown
  const queueStatusMap: Record<string, number> = {}
  for (const { status } of queueResult.data ?? []) {
    queueStatusMap[status] = (queueStatusMap[status] ?? 0) + 1
  }

  return NextResponse.json({
    domain: project.domain,
    totalBacklinks,
    referringDomains: domainsResult.data?.length ?? 0,
    dofollowCount,
    nofollowCount,
    dofollowRatio: totalBacklinks > 0 ? Math.round((dofollowCount / totalBacklinks) * 100) : 0,
    topDomains: domainsResult.data ?? [],
    topAnchors,
    queueStats: queueStatusMap,
    // Flat status fields for progress tracking
    pending: queueStatusMap['pending'] ?? 0,
    crawled: queueStatusMap['done'] ?? 0,
    backlinksFound: totalBacklinks,
  })
}
