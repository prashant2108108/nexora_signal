import { createClient } from '@/shared/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const { searchParams } = new URL(request.url)

  // Pagination
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  // Filters
  const nofollow = searchParams.get('nofollow') // 'true' | 'false' | null
  const domain = searchParams.get('domain')
  const anchor = searchParams.get('anchor')

  // Verify project belongs to user
  const { data: project } = await supabase
    .from('backlink_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  let query = supabase
    .from('backlinks')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (nofollow !== null) query = query.eq('nofollow', nofollow === 'true')
  if (domain) query = query.ilike('domain', `%${domain}%`)
  if (anchor) query = query.ilike('anchor', `%${anchor}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    backlinks: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params

  // Deleting the project will cascade delete all backlinks, queue items, and domain stats
  // due to ON DELETE CASCADE in the schema.
  const { error } = await supabase
    .from('backlink_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
