-- Add JSONB column for catering business listing specific fields.
-- Stored as NULL by default; populated only for listings in the
-- "Catering Businesses" category.
-- Partial GIN index so we can filter and query on JSONB keys without
-- indexing the NULL rows from all other categories.
--
-- is_confidential is a real column (not JSONB) so public queries can
-- filter on it cheaply without extracting from the JSON payload.

alter table public.listings
  add column if not exists business_details jsonb default null;

create index if not exists listings_business_details_gin_idx
  on public.listings using gin (business_details)
  where business_details is not null;

alter table public.listings
  add column if not exists is_confidential boolean not null default false;
