-- MANUAL JOB RESET SCRIPT
-- Run this in the Supabase SQL Editor to clear any "stuck" analyses immediately.

UPDATE public.seo_reports 
SET scan_status = 'failed', 
    failed_reason = 'Manually reset due to stuck status'
WHERE scan_status IN ('pending', 'running');

-- This will allow you to start a fresh analysis for any URL.
