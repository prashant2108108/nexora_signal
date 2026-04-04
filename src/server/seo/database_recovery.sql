-- FINAL RECOVERY MIGRATION: V4 (Comprehensive)
-- Run this in the Supabase SQL Editor

DO $$ 
BEGIN
    -- Core Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='url_hash') THEN
        ALTER TABLE public.seo_reports ADD COLUMN url_hash TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='normalized_url') THEN
        ALTER TABLE public.seo_reports ADD COLUMN normalized_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='scan_status') THEN
        ALTER TABLE public.seo_reports ADD COLUMN scan_status TEXT DEFAULT 'pending';
    END IF;

    -- Job Management
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='job_id') THEN
        ALTER TABLE public.seo_reports ADD COLUMN job_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='retry_count') THEN
        ALTER TABLE public.seo_reports ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='failed_reason') THEN
        ALTER TABLE public.seo_reports ADD COLUMN failed_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='last_error_step') THEN
        ALTER TABLE public.seo_reports ADD COLUMN last_error_step TEXT;
    END IF;

    -- Historical Data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='previous_score') THEN
        ALTER TABLE public.seo_reports ADD COLUMN previous_score INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='scan_duration_ms') THEN
        ALTER TABLE public.seo_reports ADD COLUMN scan_duration_ms INTEGER;
    END IF;
END $$;

-- 2. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_seo_reports_normalized_url ON public.seo_reports(normalized_url);
DROP INDEX IF EXISTS idx_seo_reports_org_url_hash;
CREATE UNIQUE INDEX idx_seo_reports_org_url_hash 
ON public.seo_reports(organization_id, url_hash) 
WHERE scan_status IN ('pending', 'running');

-- 3. Force Cache Reload
NOTIFY pgrst, 'reload schema';

-- 4. VERIFICATION QUERY (Run this separately to check)
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'seo_reports';
