import { createClient } from '@/shared/lib/supabase/server';
import crypto from 'crypto';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';

export interface SeoJob {
  id: string;
  url: string;
  urlHash: string;
  normalizedUrl: string;
  organizationId: string;
  userId: string;
  status: JobStatus;
  retryCount: number;
  lastErrorStep?: string;
  failedReason?: string;
  createdAt: string;
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Standardize protocol
    let normalized = parsed.protocol.toLowerCase() + '//' + parsed.hostname.toLowerCase();
    
    // Add path
    let pathname = parsed.pathname.replace(/\/$/, '') || '/';
    normalized += pathname;
    
    // Explicitly handle common tracking params if needed, but for SEO we usually want the clean URL
    // Maybe keep essential query params? User said "strip tracking params (e.g., utm_)"
    const searchParams = new URLSearchParams(parsed.search);
    const keysToStrip = Array.from(searchParams.keys()).filter(key => key.startsWith('utm_') || key === 'fbclid' || key === 'gclid');
    keysToStrip.forEach(key => searchParams.delete(key));
    
    const queryString = searchParams.toString();
    if (queryString) {
      normalized += '?' + queryString;
    }
    
    return normalized;
  } catch (e) {
    return url;
  }
}

export function generateUrlHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

export async function getOrCreateJob(url: string, orgId: string, userId: string): Promise<{ job: SeoJob; isNew: boolean }> {
  const normalized = normalizeUrl(url);
  const hash = generateUrlHash(normalized);
  const supabase = await createClient();

  // Check for active job (pending or running)
  const { data: activeJob } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('organization_id', orgId)
    .eq('url_hash', hash)
    .in('scan_status', ['pending', 'running'])
    .maybeSingle();

  if (activeJob) {
    // Stale Job Detection: If job is older than 5 minutes and still running/pending, 
    // it likely crashed or hung. We allow creating a new one.
    const createdAt = new Date(activeJob.created_at).getTime();
    const isStale = Date.now() - createdAt > 5 * 60 * 1000;

    if (!isStale) {
      return { 
        job: {
          id: activeJob.id,
          url: activeJob.url,
          urlHash: activeJob.url_hash,
          normalizedUrl: activeJob.normalized_url,
          organizationId: activeJob.organization_id,
          userId: activeJob.user_id,
          status: activeJob.scan_status,
          retryCount: activeJob.retry_count || 0,
          createdAt: activeJob.created_at
        }, 
        isNew: false 
      };
    } else {
      // Mark stale job as failed so it doesn't show up in active queries anymore
      await updateJobStatus(activeJob.id, 'failed', { 
        failed_reason: 'Job timed out or stalled (automatic cleanup)',
        last_error_step: 'stale_cleanup'
      });
    }
  }

  // Create new job
  const newJobId = crypto.randomUUID();
  const { data: newRecord, error } = await supabase
    .from('seo_reports')
    .insert([{
      id: newJobId,
      url,
      url_hash: hash,
      normalized_url: normalized,
      organization_id: orgId,
      user_id: userId,
      scan_status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('SUPABASE_INSERT_ERROR', { 
      message: error.message, 
      details: error.details, 
      hint: error.hint,
      code: error.code 
    });
    throw error;
  }

  return {
    job: {
      id: newRecord.id,
      url: newRecord.url,
      urlHash: newRecord.url_hash,
      normalizedUrl: newRecord.normalized_url,
      organizationId: newRecord.organization_id,
      userId: newRecord.user_id,
      status: newRecord.scan_status,
      retryCount: 0,
      createdAt: newRecord.created_at
    },
    isNew: true
  };
}

export async function updateJobStatus(id: string, status: JobStatus, updates: any = {}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('seo_reports')
    .update({ 
      scan_status: status,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
}
