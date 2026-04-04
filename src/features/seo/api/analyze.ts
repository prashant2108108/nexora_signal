'use server'

import { SeoAnalysisResult } from '../types'
import { createClient } from '@/shared/lib/supabase/server'
import { analyzeAndStore } from '@/server/seo/seoService'
import { getUserOrganizations, updateLastActiveOrg, createOrganization } from '@/server/db/organizations'

export async function analyzeUrl(url: string): Promise<SeoAnalysisResult> {
  if (!url || !url.startsWith('http')) {
    return { success: false, error: 'Invalid URL. Must include http/https.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized. Please log in.' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('last_org_id')
    .eq('user_id', user.id)
    .single()

  let orgId = settings?.last_org_id

  if (!orgId) {
    // Fallback: Get first available organization
    const orgs = await getUserOrganizations()
    if (orgs.length > 0) {
      orgId = orgs[0].id
      // Persist for next time
      await updateLastActiveOrg(orgId)
    } else {
      // Auto-create a "Personal" workspace if none exists
      try {
        const newOrg = await createOrganization("My Workspace")
        orgId = newOrg.id
        await updateLastActiveOrg(orgId)
      } catch (err) {
        return { success: false, error: 'No active organization found and failed to auto-create workspace.' }
      }
    }
  }

  try {
    const result = await analyzeAndStore(url, user.id, orgId)
    
    // Handle deduplication 'pending' case
    if ((result as any).status === 'pending') {
      return { 
        success: true, 
        report: { 
          id: (result as any).id,
          url,
          status: 'pending',
          version: 'v2',
          message: 'Analysis already in progress'
        } as any
      }
    }

    const { score, partialFailure, advanced, version, data } = result as any
    const processingTime = (result as any).processing_time_ms
    
    return {
      success: true,
      report: {
        url,
        score,
        version: version || "v2",
        partialFailure,
        advanced: advanced,
        recommendations: advanced?.recommendations || [],
        status: partialFailure ? "completed_with_warnings" : "completed",
        processingTimeMs: processingTime,
        
        // Final Mapping from Consolidated Data
        links: data?.links || (result as any).links,
        images: data?.images || (result as any).images,
        pageSpeed: data?.pageSpeed || (result as any).pageSpeed,
        keywords: data?.keywords || (result as any).keywords,
        data: data || (result as any).data,
        issuesSummary: advanced?.issuesSummary
      } as any
    }
  } catch (err: any) {
    console.error('API_ANALYZE_URL_FAILED', { url, error: err.message || err })
    return { success: false, error: err.message || 'Failed to analyze URL' }
  }
}
