-- Stores CaterBot's validated source metadata without changing existing listing flows.
-- These columns are additive and safe to run on an existing Supabase project.

alter table public.listings
  add column if not exists caterbot_source_url text,
  add column if not exists caterbot_source_title text,
  add column if not exists caterbot_source_domain text,
  add column if not exists caterbot_source_confidence_score integer,
  add column if not exists caterbot_source_verified_at timestamptz,
  add column if not exists caterbot_source_matched_fields jsonb not null default '[]'::jsonb,
  add column if not exists caterbot_source_priority_rank integer;

create index if not exists listings_caterbot_source_domain_idx
  on public.listings (caterbot_source_domain);

create index if not exists listings_caterbot_source_verified_at_idx
  on public.listings (caterbot_source_verified_at);

create index if not exists listings_caterbot_source_priority_rank_idx
  on public.listings (caterbot_source_priority_rank);
