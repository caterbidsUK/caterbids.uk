create extension if not exists "pgcrypto";

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  location text null,
  category text not null default 'all',
  condition text not null default 'all',
  search_url text null,
  search_query text null,
  city text null,
  created_at timestamptz not null default now()
);

alter table public.saved_searches add column if not exists search_url text;
alter table public.saved_searches add column if not exists search_query text;
alter table public.saved_searches add column if not exists city text;

create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  external_id text not null,
  title text not null,
  price text null,
  location text null,
  category text null,
  condition text null,
  image_url text null,
  url text null,
  created_at timestamptz not null default now(),
  unique(user_id, source, external_id)
);

alter table public.saved_searches enable row level security;
alter table public.favourites enable row level security;

drop policy if exists "saved_searches_select_own" on public.saved_searches;
drop policy if exists "saved_searches_insert_own" on public.saved_searches;
drop policy if exists "saved_searches_delete_own" on public.saved_searches;
drop policy if exists "favourites_select_own" on public.favourites;
drop policy if exists "favourites_insert_own" on public.favourites;
drop policy if exists "favourites_delete_own" on public.favourites;

create policy "saved_searches_select_own"
on public.saved_searches
for select
to authenticated
using (auth.uid() = user_id);

create policy "saved_searches_insert_own"
on public.saved_searches
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "saved_searches_delete_own"
on public.saved_searches
for delete
to authenticated
using (auth.uid() = user_id);

create policy "favourites_select_own"
on public.favourites
for select
to authenticated
using (auth.uid() = user_id);

create policy "favourites_insert_own"
on public.favourites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "favourites_delete_own"
on public.favourites
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists saved_searches_user_created_at_idx
on public.saved_searches(user_id, created_at desc);

create index if not exists favourites_user_created_at_idx
on public.favourites(user_id, created_at desc);
