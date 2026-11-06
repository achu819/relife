-- Run this once in Supabase SQL Editor to enable ReLife's AI Innovation Studio.
create table if not exists public.innovations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('object','space')),
  title text not null,
  description text,
  original_image_url text not null,
  generated_image_url text,
  guide jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists innovations_user_created_idx on public.innovations(user_id, created_at desc);
alter table public.innovations enable row level security;
drop policy if exists "Users read own ReLife innovations" on public.innovations;
create policy "Users read own ReLife innovations" on public.innovations for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own ReLife innovations" on public.innovations;
create policy "Users create own ReLife innovations" on public.innovations for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own ReLife innovations" on public.innovations;
create policy "Users update own ReLife innovations" on public.innovations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own ReLife innovations" on public.innovations;
create policy "Users delete own ReLife innovations" on public.innovations for delete to authenticated using (auth.uid() = user_id);
