-- Run this once in Supabase SQL Editor to enable ReLife's AI Innovation Studio.
-- Project photos are stored in a PRIVATE bucket and served with short-lived signed URLs.
create table if not exists public.innovations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('object','space')),
  title text not null,
  description text,
  original_image_path text not null,
  generated_image_path text,
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relife-projects', 'relife-projects', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Owners read own ReLife project photos" on storage.objects;
create policy "Owners read own ReLife project photos" on storage.objects for select to authenticated
using (bucket_id = 'relife-projects' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners upload ReLife project photos" on storage.objects;
create policy "Owners upload ReLife project photos" on storage.objects for insert to authenticated
with check (bucket_id = 'relife-projects' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners delete ReLife project photos" on storage.objects;
create policy "Owners delete ReLife project photos" on storage.objects for delete to authenticated
using (bucket_id = 'relife-projects' and (storage.foldername(name))[1] = auth.uid()::text);
