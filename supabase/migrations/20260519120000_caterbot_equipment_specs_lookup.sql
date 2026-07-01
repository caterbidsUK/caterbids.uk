create extension if not exists pgcrypto;

create table if not exists public.equipment_specs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  seller_id uuid references auth.users(id) on delete cascade,
  brand text,
  model text,
  product_name text,
  serial_number text,
  equipment_type text,
  raw_ocr_text text,
  main_image_analysis jsonb default '{}'::jsonb,
  spec_plate_analysis jsonb default '{}'::jsonb,
  search_queries jsonb default '[]'::jsonb,
  source_results jsonb default '[]'::jsonb,
  height_cm numeric,
  width_cm numeric,
  depth_cm numeric,
  weight_kg numeric,
  net_weight_kg numeric,
  gross_weight_kg numeric,
  capacity_litres numeric,
  power_type text,
  voltage text,
  phase text,
  frequency text,
  watts numeric,
  amps numeric,
  gas_type text,
  gas_connection text,
  heat_input_kw numeric,
  refrigerant text,
  refrigerant_mass text,
  pallet_required boolean,
  suggested_pallet_size text,
  delivery_notes text,
  safety_note text,
  source_url text,
  source_title text,
  source_type text,
  confidence_score integer default 0,
  checked_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.equipment_specs
  add column if not exists listing_id uuid references public.listings(id) on delete cascade,
  add column if not exists seller_id uuid references auth.users(id) on delete cascade,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists product_name text,
  add column if not exists serial_number text,
  add column if not exists equipment_type text,
  add column if not exists raw_ocr_text text,
  add column if not exists main_image_analysis jsonb default '{}'::jsonb,
  add column if not exists spec_plate_analysis jsonb default '{}'::jsonb,
  add column if not exists search_queries jsonb default '[]'::jsonb,
  add column if not exists source_results jsonb default '[]'::jsonb,
  add column if not exists height_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists depth_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists net_weight_kg numeric,
  add column if not exists gross_weight_kg numeric,
  add column if not exists capacity_litres numeric,
  add column if not exists power_type text,
  add column if not exists voltage text,
  add column if not exists phase text,
  add column if not exists frequency text,
  add column if not exists watts numeric,
  add column if not exists amps numeric,
  add column if not exists gas_type text,
  add column if not exists gas_connection text,
  add column if not exists heat_input_kw numeric,
  add column if not exists refrigerant text,
  add column if not exists refrigerant_mass text,
  add column if not exists pallet_required boolean,
  add column if not exists suggested_pallet_size text,
  add column if not exists delivery_notes text,
  add column if not exists safety_note text,
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists source_type text,
  add column if not exists confidence_score integer default 0,
  add column if not exists checked_at timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists equipment_specs_listing_id_uidx
on public.equipment_specs (listing_id)
where listing_id is not null;

create index if not exists equipment_specs_seller_id_idx on public.equipment_specs (seller_id);
create index if not exists equipment_specs_brand_model_idx on public.equipment_specs (lower(brand), lower(model));
create index if not exists equipment_specs_checked_at_idx on public.equipment_specs (checked_at);
create index if not exists equipment_specs_confidence_score_idx on public.equipment_specs (confidence_score);

alter table public.equipment_specs enable row level security;

drop policy if exists equipment_specs_select_public on public.equipment_specs;
create policy equipment_specs_select_public
on public.equipment_specs
for select
using (true);

drop policy if exists equipment_specs_insert_own on public.equipment_specs;
create policy equipment_specs_insert_own
on public.equipment_specs
for insert
to authenticated
with check (seller_id = auth.uid());

drop policy if exists equipment_specs_update_own on public.equipment_specs;
create policy equipment_specs_update_own
on public.equipment_specs
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists equipment_specs_service_role_manage on public.equipment_specs;
create policy equipment_specs_service_role_manage
on public.equipment_specs
for all
to service_role
using (true)
with check (true);
