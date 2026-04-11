-- SQL Schema for Instagram Messaging
-- Run this in your Supabase SQL Editor

create table public.instagram_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text not null,
  message text,
  response text,
  mid text unique, -- Message ID from Meta for deduplication
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Deduplication support index
create index idx_instagram_messages_mid on public.instagram_messages (mid);

-- RLS Policy for Webhook Insert (Bypass auth for anonymous webhook calls)
alter table public.instagram_messages enable row level security;

create policy "Allow inserts from webhook"
on public.instagram_messages
for insert
to anon
with check (true);

-- Allow authenticated users (admins) to read messages
create policy "Allow authenticated users to read"
on public.instagram_messages
for select
to authenticated
using (true);
