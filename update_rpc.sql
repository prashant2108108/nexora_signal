-- ============================================
-- RPC UPDATE SCRIPT
-- Run this to update logic without recreating tables
-- ============================================

-- 1. Updated single upsert (for unique counting and internal filtering)
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
    SELECT domain INTO v_project_domain FROM backlink_projects WHERE id = p_project_id;
    IF p_domain = v_project_domain OR p_domain = 'www.' || v_project_domain OR v_project_domain = 'www.' || p_domain THEN
        RETURN;
    END IF;

    INSERT INTO backlinks (project_id, source_url, target_url, anchor, nofollow, domain)
    VALUES (p_project_id, p_source_url, p_target_url, p_anchor, p_nofollow, p_domain)
    ON CONFLICT (project_id, source_url, target_url) DO NOTHING;
    
    GET DIAGNOSTICS v_is_new = ROW_COUNT;

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

-- 2. New batch upsert (for performance)
CREATE OR REPLACE FUNCTION upsert_backlinks_batch(
    p_project_id UUID,
    p_backlinks JSONB
) RETURNS VOID AS $$
DECLARE
    v_backlink RECORD;
    v_project_domain TEXT;
    v_is_new BOOLEAN;
BEGIN
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
