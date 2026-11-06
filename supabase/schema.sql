-- ReLife Supabase schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('object', 'space', 'material')),
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 5 and 1200),
  location text check (location is null or char_length(location) <= 100),
  image_url text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_type_idx on public.listings (type);
alter table public.listings enable row level security;

drop policy if exists "Anyone can read active ReLife listings" on public.listings;
create policy "Anyone can read active ReLife listings" on public.listings for select
using (status = 'active' or auth.uid() = user_id);

drop policy if exists "Signed-in users can publish ReLife listings" on public.listings;
create policy "Signed-in users can publish ReLife listings" on public.listings for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owners can update their ReLife listings" on public.listings;
create policy "Owners can update their ReLife listings" on public.listings for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners can delete their ReLife listings" on public.listings;
create policy "Owners can delete their ReLife listings" on public.listings for delete to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relife-photos', 'relife-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view ReLife photos" on storage.objects;
create policy "Public can view ReLife photos" on storage.objects for select
using (bucket_id = 'relife-photos');

drop policy if exists "Users upload ReLife photos to own folder" on storage.objects;
create policy "Users upload ReLife photos to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'relife-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own ReLife photos" on storage.objects;
create policy "Users delete own ReLife photos" on storage.objects for delete to authenticated
using (bucket_id = 'relife-photos' and (storage.foldername(name))[1] = auth.uid()::text);
