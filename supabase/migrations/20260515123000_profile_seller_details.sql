alter table public.profiles
  add column if not exists seller_contact_name text,
  add column if not exists collection_full_address text,
  add column if not exists collection_city text,
  add column if not exists collection_postcode text;
