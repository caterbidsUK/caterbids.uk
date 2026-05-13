alter table public.listings
  add column if not exists power_type text null,
  add column if not exists gas_type text null,
  add column if not exists electrical_phase text null,
  add column if not exists dimensions text null,
  add column if not exists service_history text null,
  add column if not exists warranty_type text null,
  add column if not exists manuals_available boolean null default false,
  add column if not exists tested_status text null,
  add column if not exists delivery_option text null,
  add column if not exists collection_postcode text null,
  add column if not exists vat_included boolean null default false;
