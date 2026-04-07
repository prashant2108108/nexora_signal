-- ============================================
-- BACKLINK CRAWLER SYSTEM — SCHEMA
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Projects: one per target domain per user
CREATE TABLE backlink_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'discovering', 'crawling', 'done', 'failed')),
    max_urls INT DEFAULT 5000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, domain)
);

-- Crawl Queue: table-based job queue
CREATE TABLE crawl_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES backlink_projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    depth INT NOT NULL DEFAULT 0,
    retries INT NOT NULL DEFAULT 0,
    last_crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Deduplication: prevent same URL added twice per project
    UNIQUE(project_id, url)
);

-- Backlinks: extracted backlinks pointing to target domain
CREATE TABLE backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES backlink_projects(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    anchor TEXT,
    nofollow BOOLEAN NOT NULL DEFAULT FALSE,
    domain TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Deduplication: same source→target pair per project only once
    UNIQUE(project_id, source_url, target_url)
);

-- Backlink Domains: aggregated domain stats
CREATE TABLE backlink_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES backlink_projects(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    backlink_count INT NOT NULL DEFAULT 0,
    dofollow_count INT NOT NULL DEFAULT 0,
    nofollow_count INT NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, domain)
);

-- ============================================
-- INDEXES (Performance)
-- ============================================
CREATE INDEX idx_backlinks_project ON backlinks(project_id);
CREATE INDEX idx_backlinks_domain ON backlinks(domain);
CREATE INDEX idx_backlinks_nofollow ON backlinks(nofollow);
CREATE INDEX idx_queue_status ON crawl_queue(status);
CREATE INDEX idx_queue_project ON crawl_queue(project_id);
CREATE INDEX idx_queue_project_status ON crawl_queue(project_id, status);
CREATE INDEX idx_domains_project ON backlink_domains(project_id);
CREATE INDEX idx_projects_user ON backlink_projects(user_id);

-- ============================================
-- ATOMIC QUEUE LOCKING (Race-condition safe)
-- Workers call this function to claim a job
-- Uses FOR UPDATE SKIP LOCKED for multi-worker safety
-- ============================================
CREATE OR REPLACE FUNCTION claim_crawl_job(p_project_id UUID)
RETURNS SETOF crawl_queue AS $$
BEGIN
    RETURN QUERY
    UPDATE crawl_queue
    SET status = 'processing', last_crawled_at = NOW()
    WHERE id = (
        SELECT id FROM crawl_queue
        WHERE project_id = p_project_id
          AND status = 'pending'
          AND retries <= 2
        ORDER BY depth ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPSERT BACKLINK + UPDATE DOMAIN STATS
-- Called by crawlwer after each backlink found
-- ============================================
CREATE OR REPLACE FUNCTION upsert_backlink(
    p_project_id UUID,
    p_source_url TEXT,
    p_target_url TEXT,
    p_anchor TEXT,
    p_nofollow BOOLEAN,
    p_domain TEXT
) RETURNS VOID AS $$
DECLARE
    v_project_domain TEXT;
    v_is_new BOOLEAN;
BEGIN
    -- Get project domain to check for internal links
    SELECT domain INTO v_project_domain FROM backlink_projects WHERE id = p_project_id;
    
    -- Exclude internal links (where source domain matches project domain)
    IF p_domain = v_project_domain OR p_domain = 'www.' || v_project_domain OR v_project_domain = 'www.' || p_domain THEN
        RETURN;
    END IF;

    -- Insert backlink (ignore if already exists)
    INSERT INTO backlinks (project_id, source_url, target_url, anchor, nofollow, domain)
    VALUES (p_project_id, p_source_url, p_target_url, p_anchor, p_nofollow, p_domain)
    ON CONFLICT (project_id, source_url, target_url) DO NOTHING;
    
    GET DIAGNOSTICS v_is_new = ROW_COUNT;

    -- Only update domain stats if it's a NEW unique link
    IF v_is_new THEN
        INSERT INTO backlink_domains (project_id, domain, backlink_count, dofollow_count, nofollow_count)
        VALUES (
            p_project_id, p_domain, 1,
            CASE WHEN p_nofollow THEN 0 ELSE 1 END,
            CASE WHEN p_nofollow THEN 1 ELSE 0 END
        )
        ON CONFLICT (project_id, domain) DO UPDATE SET
            backlink_count = backlink_domains.backlink_count + 1,
            dofollow_count = backlink_domains.dofollow_count + CASE WHEN p_nofollow THEN 0 ELSE 1 END,
            nofollow_count = backlink_domains.nofollow_count + CASE WHEN p_nofollow THEN 1 ELSE 0 END,
            last_seen_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BATCH UPSERT BACKLINKS + UPDATE DOMAIN STATS
-- Consolidates multiple saves into one transaction
-- ============================================
CREATE OR REPLACE FUNCTION upsert_backlinks_batch(
    p_project_id UUID,
    p_backlinks JSONB -- Array of {source_url, target_url, anchor, nofollow, domain}
) RETURNS VOID AS $$
DECLARE
    v_backlink RECORD;
    v_project_domain TEXT;
    v_is_new BOOLEAN;
BEGIN
    -- Get project domain once
    SELECT domain INTO v_project_domain FROM backlink_projects WHERE id = p_project_id;

    FOR v_backlink IN SELECT * FROM jsonb_to_recordset(p_backlinks) AS x(
        source_url TEXT, target_url TEXT, anchor TEXT, nofollow BOOLEAN, domain TEXT
    ) LOOP
        -- Exclude internal links
        IF v_backlink.domain = v_project_domain OR v_backlink.domain = 'www.' || v_project_domain OR v_project_domain = 'www.' || v_backlink.domain THEN
            CONTINUE;
        END IF;

        -- Insert backlink
        INSERT INTO backlinks (project_id, source_url, target_url, anchor, nofollow, domain)
        VALUES (p_project_id, v_backlink.source_url, v_backlink.target_url, v_backlink.anchor, v_backlink.nofollow, v_backlink.domain)
        ON CONFLICT (project_id, source_url, target_url) DO NOTHING;

        GET DIAGNOSTICS v_is_new = ROW_COUNT;

        -- Update domain stats if new
        IF v_is_new THEN
            INSERT INTO backlink_domains (project_id, domain, backlink_count, dofollow_count, nofollow_count)
            VALUES (
                p_project_id, v_backlink.domain, 1,
                CASE WHEN v_backlink.nofollow THEN 0 ELSE 1 END,
                CASE WHEN v_backlink.nofollow THEN 1 ELSE 0 END
            )
            ON CONFLICT (project_id, domain) DO UPDATE SET
                backlink_count = backlink_domains.backlink_count + 1,
                dofollow_count = backlink_domains.dofollow_count + CASE WHEN v_backlink.nofollow THEN 0 ELSE 1 END,
                nofollow_count = backlink_domains.nofollow_count + CASE WHEN v_backlink.nofollow THEN 1 ELSE 0 END,
                last_seen_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE backlink_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_domains ENABLE ROW LEVEL SECURITY;

-- Projects: users manage only their own
CREATE POLICY "Users manage own projects"
ON backlink_projects FOR ALL USING (auth.uid() = user_id);

-- Crawl queue: full access for project owner
CREATE POLICY "Users view own queue"
ON crawl_queue FOR SELECT
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = crawl_queue.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users insert own queue"
ON crawl_queue FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = crawl_queue.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users update own queue"
ON crawl_queue FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = crawl_queue.project_id AND p.user_id = auth.uid()
));

-- Backlinks: readable + insertable by project owner
CREATE POLICY "Users view own backlinks"
ON backlinks FOR SELECT
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlinks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users insert own backlinks"
ON backlinks FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlinks.project_id AND p.user_id = auth.uid()
));

-- Backlink domains: full access for project owner
CREATE POLICY "Users view own domains"
ON backlink_domains FOR SELECT
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlink_domains.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users insert own domains"
ON backlink_domains FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlink_domains.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users update own domains"
ON backlink_domains FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlink_domains.project_id AND p.user_id = auth.uid()
));
