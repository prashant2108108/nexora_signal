-- SQL Schema for Instagram Media, Comments, and Insights
-- Safe to re-run (idempotent)

-- 1. Instagram Media (Posts and Reels)
create table if not exists public.instagram_media (
  id uuid default gen_random_uuid() primary key,
  ig_id text unique not null,
  caption text,
  media_type text,
  media_url text,
  permalink text,
  timestamp timestamp with time zone,
  like_count integer default 0,
  comments_count integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- 2. Instagram Comments
create table if not exists public.instagram_comments (
  id uuid default gen_random_uuid() primary key,
  ig_id text unique not null,
  media_id text,
  text text,
  username text,
  timestamp timestamp with time zone,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 3. Instagram Insights
create table if not exists public.instagram_insights (
  id uuid default gen_random_uuid() primary key,
  metric_name text not null,
  value integer not null,
  period text,
  target_id text,
  end_time timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(metric_name, target_id, end_time)
);

-- Indexes
create index if not exists idx_instagram_media_timestamp on public.instagram_media(timestamp desc);
create index if not exists idx_instagram_comments_media_id on public.instagram_comments(media_id);
create index if not exists idx_instagram_insights_metric on public.instagram_insights(metric_name, target_id);

-- Enable RLS
alter table public.instagram_media enable row level security;
alter table public.instagram_comments enable row level security;
alter table public.instagram_insights enable row level security;

-- Drop existing policies before recreating (safe to re-run)
drop policy if exists "Allow authenticated users to read media" on public.instagram_media;
drop policy if exists "Allow authenticated users to read comments" on public.instagram_comments;
drop policy if exists "Allow authenticated users to read insights" on public.instagram_insights;
drop policy if exists "Allow anon to insert comments" on public.instagram_comments;

-- Recreate policies
create policy "Allow authenticated users to read media" on public.instagram_media for select to authenticated using (true);
create policy "Allow authenticated users to read comments" on public.instagram_comments for select to authenticated using (true);
create policy "Allow authenticated users to read insights" on public.instagram_insights for select to authenticated using (true);
create policy "Allow anon to insert comments" on public.instagram_comments for insert to anon with check (true);

