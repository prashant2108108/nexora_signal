-- ============================================
-- DATA SYNC & CLEANUP SCRIPT
-- Run this in Supabase SQL Editor to fix discrepancies
-- ============================================

-- 1. Remove internal links from backlinks table
DELETE FROM backlinks
WHERE domain IN (
    SELECT domain FROM backlink_projects p WHERE p.id = backlinks.project_id
) OR domain IN (
    SELECT 'www.' || domain FROM backlink_projects p WHERE p.id = backlinks.project_id
);

-- 2. Clear existing domain stats to recalculate
DELETE FROM backlink_domains;

-- 3. Re-populate domain stats from unique backlinks
INSERT INTO backlink_domains (project_id, domain, backlink_count, dofollow_count, nofollow_count)
SELECT 
    project_id, 
    domain, 
    COUNT(*) as backlink_count,
    COUNT(*) FILTER (WHERE NOT nofollow) as dofollow_count,
    COUNT(*) FILTER (WHERE nofollow) as nofollow_count
FROM backlinks
GROUP BY project_id, domain;

-- 4. Check results
SELECT COUNT(*) as unique_backlinks FROM backlinks;
SELECT SUM(backlink_count) as domain_stats_total FROM backlink_domains;
