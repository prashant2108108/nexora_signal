import { parseUrl } from './analyzer'
import { getRecentReport } from '../db/seoReports'
import { getOrCreateJob, updateJobStatus, normalizeUrl } from './jobQueue'

export async function analyzeAndStore(url: string, userId: string, organizationId: string) {
  const startTime = Date.now()
  const normalizedUrl = normalizeUrl(url)
  
  try {
    // 1. Idempotency & Job Lifecycle Management
    const { job, isNew } = await getOrCreateJob(url, organizationId, userId)
    
    // 2. Optimization: Return active job if already running
    if (!isNew && (job.status === 'pending' || job.status === 'running')) {
      console.log('JOB_ALREADY_ACTIVE', { id: job.id, url: normalizedUrl })
      return { id: job.id, status: job.status, is_active: true }
    }

    // 3. Deduplication Check (only if new job and not explicitly requested to re-scan)
    if (isNew) {
      const recent = await getRecentReport(normalizedUrl, organizationId, 10)
      if (recent && recent.report) {
        console.log('DEDUPLICATED_SUCCESS', { url: normalizedUrl })
        await updateJobStatus(job.id, 'completed', {
          score: recent.score,
          summary: recent.summary,
          report: recent.report,
          processing_time_ms: 0,
          previous_score: recent.score // For trend line stability
        })
        return recent.report
      }
    }

    // 4. Mark Job as Running & Start Analysis
    try {
      await updateJobStatus(job.id, 'running', { 
        last_scanned_at: new Date().toISOString() 
      })

      // Fetch previous score for trend insight (historical lookback 30 days)
      const previous = await getRecentReport(normalizedUrl, organizationId, 43200) // 30 days
      const previousScore = previous?.score || null

      // 5. Heavy Orchestration with Fail-Safe Timeout
      const analysisPromise = parseUrl(url) 
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000)
      )

      let result: any;
      try {
        result = await Promise.race([analysisPromise, timeoutPromise]) as any
      } catch (err: any) {
        const isTimeout = err.message.includes('timed out')
        await updateJobStatus(job.id, isTimeout ? 'partial' : 'failed', {
          failed_reason: err.message,
          last_error_step: isTimeout ? 'orch_timeout' : 'orch_crash',
          processing_time_ms: Date.now() - startTime
        })
        throw err
      }

      // 6. Finalization & Score Calculations
      const duration = Date.now() - startTime
      
      // Add trend and trust signals
      result.advanced = {
        ...result.advanced,
        previousScore,
        scoreChange: previousScore !== null ? (result.score - previousScore) : 0,
        trend: !previousScore ? 'stable' : (result.score > previousScore ? 'improving' : (result.score < previousScore ? 'declining' : 'stable')),
        technical: {
          ...result.advanced?.technical,
          indexing: {
            ...result.advanced?.technical?.indexing,
            stats: {
              ...result.advanced?.technical?.indexing?.stats,
              scanDurationMs: duration
            }
          }
        }
      }

      // Update DB record
      await updateJobStatus(job.id, 'completed', {
        score: result.score,
        summary: {
          totalScore: result.score,
          health: result.pageHealth || result.status,
          issues: result.advanced?.issuesSummary || { critical: 0, warnings: 0, passed: 0 }
        },
        report: result,
        processing_time_ms: duration,
        previous_score: previousScore
      })

      return result
    } catch (outerErr: any) {
      console.error('SEO_ANALYSIS_FAILED_CRITICAL', { url, error: outerErr.message })
      
      // Fallback update in case the inner ones failed or were skipped
      try {
        await updateJobStatus(job.id, 'failed', {
          failed_reason: outerErr.message || 'Unknown critical error',
          last_error_step: 'service_outer_catch'
        })
      } catch (silentErr) {
        // Suppress secondary error to keep focus on original
      }
      
      throw outerErr
    }
  } catch (err: any) {
    console.error('CRITICAL_SERVICE_ERROR', { url, error: err.message });
    throw err;
  }
}
