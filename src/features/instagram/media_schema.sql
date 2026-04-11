-- SQL Schema for Instagram Media, Comments, and Insights
-- Run this in your Supabase SQL Editor

-- 1. Instagram Media (Posts and Reels)
create table if not exists public.instagram_media (
  id uuid default gen_random_uuid() primary key,
  ig_id text unique not null,
  caption text,
  media_type text, -- IMAGE, VIDEO, CAROUSEL_ALBUM
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
  media_id text references public.instagram_media(ig_id) on delete cascade,
  text text,
  username text,
  timestamp timestamp with time zone,
  status text default 'pending', -- pending, replied, ignored
  created_at timestamp with time zone default now()
);

-- 3. Instagram Insights (Aggregated metrics)
create table if not exists public.instagram_insights (
  id uuid default gen_random_uuid() primary key,
  metric_name text not null,
  value integer not null,
  period text, -- day, week, days_28, lifetime
  target_id text, -- page id or media id
  end_time timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(metric_name, target_id, end_time)
);

-- Indexes for performance
create index if not exists idx_instagram_media_timestamp on public.instagram_media(timestamp desc);
create index if not exists idx_instagram_comments_media_id on public.instagram_comments(media_id);
create index if not exists idx_instagram_insights_metric on public.instagram_insights(metric_name, target_id);

-- RLS Policies
alter table public.instagram_media enable row level security;
alter table public.instagram_comments enable row level security;
alter table public.instagram_insights enable row level security;

-- Allow authenticated users to read everything
create policy "Allow authenticated users to read media" on public.instagram_media for select to authenticated using (true);
create policy "Allow authenticated users to read comments" on public.instagram_comments for select to authenticated using (true);
create policy "Allow authenticated users to read insights" on public.instagram_insights for select to authenticated using (true);

-- Allow anon (webhook) to insert comments
create policy "Allow anon to insert comments" on public.instagram_comments for insert to anon with check (true);
