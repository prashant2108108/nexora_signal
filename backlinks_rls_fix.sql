-- ============================================
-- RLS FIX: Add missing INSERT/UPDATE policies
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- crawl_queue: allow users to INSERT into their own project's queue
CREATE POLICY "Users insert own queue"
ON crawl_queue FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = crawl_queue.project_id AND p.user_id = auth.uid()
));

-- crawl_queue: allow users to UPDATE their own project's queue entries
CREATE POLICY "Users update own queue"
ON crawl_queue FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = crawl_queue.project_id AND p.user_id = auth.uid()
));

-- backlinks: allow INSERT (needed if you insert directly, not via RPC)
CREATE POLICY "Users insert own backlinks"
ON backlinks FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM backlink_projects p
    WHERE p.id = backlinks.project_id AND p.user_id = auth.uid()
));

-- backlink_domains: allow INSERT/UPDATE
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
