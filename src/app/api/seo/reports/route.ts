import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import { getSeoReports } from '@/server/db/seoReports'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get Active Organization
    const { data: settings } = await supabase
      .from('user_settings')
      .select('last_org_id')
      .eq('user_id', user.id)
      .single()

    const organizationId = settings?.last_org_id
    if (!organizationId) {
      return NextResponse.json({ reports: [], total: 0, page, limit })
    }

    const result = await getSeoReports(organizationId, page, limit)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('SEO Reports API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
