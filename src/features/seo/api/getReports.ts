'use server'

import { createClient } from '@/shared/lib/supabase/server'

export interface DbSeoReport {
  id: string
  url: string
  score: number
  created_at: string
}

export async function getSeoReports(): Promise<DbSeoReport[]> {
  try {
    const response = await fetch('/api/seo/reports?page=1&limit=20')
    if (!response.ok) throw new Error('Failed to fetch reports')
    const data = await response.json()
    return data.reports || []
  } catch (error) {
    console.error('Error in getSeoReports:', error)
    return []
  }
}
