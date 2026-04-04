-- MASTER SEO SETUP & REPAIR SCRIPT (V4)
-- Run this in the Supabase SQL Editor to fix everything at once.

-- 1. Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.seo_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    url TEXT NOT NULL,
    score INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    summary JSONB,
    report JSONB,
    processing_time_ms INTEGER,
    is_async BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add all missing columns (Safe check)
DO $$ 
BEGIN
    -- V2/V3 Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='url_hash') THEN
        ALTER TABLE public.seo_reports ADD COLUMN url_hash TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='normalized_url') THEN
        ALTER TABLE public.seo_reports ADD COLUMN normalized_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='scan_status') THEN
        ALTER TABLE public.seo_reports ADD COLUMN scan_status TEXT DEFAULT 'pending';
    END IF;

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

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='previous_score') THEN
        ALTER TABLE public.seo_reports ADD COLUMN previous_score INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='scan_duration_ms') THEN
        ALTER TABLE public.seo_reports ADD COLUMN scan_duration_ms INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='status') THEN
        ALTER TABLE public.seo_reports ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='updated_at') THEN
        ALTER TABLE public.seo_reports ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='last_scanned_at') THEN
        ALTER TABLE public.seo_reports ADD COLUMN last_scanned_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='report') THEN
        ALTER TABLE public.seo_reports ADD COLUMN report JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seo_reports' AND column_name='summary') THEN
        ALTER TABLE public.seo_reports ADD COLUMN summary JSONB;
    END IF;
    
    -- Fix constraint issues
    ALTER TABLE public.seo_reports ALTER COLUMN score DROP NOT NULL;
    ALTER TABLE public.seo_reports ALTER COLUMN status DROP NOT NULL;
END $$;

-- 3. Cleanup & Indexes
CREATE INDEX IF NOT EXISTS idx_seo_reports_org_id ON public.seo_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_reports_normalized_url ON public.seo_reports(normalized_url);
DROP INDEX IF EXISTS idx_seo_reports_org_url_hash;
CREATE UNIQUE INDEX idx_seo_reports_org_url_hash 
ON public.seo_reports(organization_id, url_hash) 
WHERE scan_status IN ('pending', 'running');

-- 4. Final Sync
NOTIFY pgrst, 'reload schema';

-- 5. DIAGNOSTIC CHECK (Run this after the script)
-- SELECT table_schema, table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_name ILIKE '%seo_reports%';
