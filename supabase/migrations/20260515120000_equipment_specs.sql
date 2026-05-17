do $$
begin
  create type public.equipment_spec_source_type as enum ('Manufacturer', 'Dealer', 'Catalog', 'Other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public."Sources" (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  source_name text,
  source_type public.equipment_spec_source_type not null default 'Other',
  default_trust integer not null default 50 check (default_trust between 0 and 100),
  notes text,
  last_checked date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public."EquipmentSpecs" (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  category text not null,
  ext_height_cm numeric,
  ext_width_cm numeric,
  ext_depth_cm numeric,
  pack_height_cm numeric,
  pack_width_cm numeric,
  pack_depth_cm numeric,
  weight_net_kg numeric,
  weight_gross_kg numeric,
  pallet_required boolean not null default false,
  power_type text,
  voltage text,
  phase integer,
  current_a numeric,
  gas_type text,
  gas_connection text,
  lifting_notes text,
  disassembly_notes text,
  hazardous_notes text,
  source_url text,
  source_name text,
  source_type public.equipment_spec_source_type not null default 'Other',
  confidence integer not null default 0 check (confidence between 0 and 100),
  last_checked date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public."EquipmentSpecs"
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists category text,
  add column if not exists ext_height_cm numeric,
  add column if not exists ext_width_cm numeric,
  add column if not exists ext_depth_cm numeric,
  add column if not exists pack_height_cm numeric,
  add column if not exists pack_width_cm numeric,
  add column if not exists pack_depth_cm numeric,
  add column if not exists weight_net_kg numeric,
  add column if not exists weight_gross_kg numeric,
  add column if not exists pallet_required boolean not null default false,
  add column if not exists power_type text,
  add column if not exists voltage text,
  add column if not exists phase integer,
  add column if not exists current_a numeric,
  add column if not exists gas_type text,
  add column if not exists gas_connection text,
  add column if not exists lifting_notes text,
  add column if not exists disassembly_notes text,
  add column if not exists hazardous_notes text,
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists source_type public.equipment_spec_source_type not null default 'Other',
  add column if not exists confidence integer not null default 0,
  add column if not exists last_checked date not null default current_date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists equipment_specs_brand_model_uidx
on public."EquipmentSpecs" (lower(brand), lower(model));

create index if not exists equipment_specs_brand_idx on public."EquipmentSpecs" (brand);
create index if not exists equipment_specs_model_idx on public."EquipmentSpecs" (model);
create index if not exists equipment_specs_category_idx on public."EquipmentSpecs" (category);
create index if not exists equipment_specs_confidence_idx on public."EquipmentSpecs" (confidence);
create index if not exists equipment_specs_last_checked_idx on public."EquipmentSpecs" (last_checked);

alter table public.listings
  add column if not exists equipment_spec_id uuid references public."EquipmentSpecs"(id) on delete set null,
  add column if not exists spec_plate_image_url text,
  add column if not exists spec_plate_ocr_text text,
  add column if not exists spec_brand text,
  add column if not exists spec_model text,
  add column if not exists spec_serial_number text,
  add column if not exists spec_gc_number text,
  add column if not exists spec_moderation_status text default 'pending',
  add column if not exists spec_moderation_notes text;

create table if not exists public.listing_equipment_specs (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null unique,
  equipment_spec_id uuid references public."EquipmentSpecs"(id) on delete set null,
  seller_id uuid,
  brand text not null,
  model text not null,
  serial_number text,
  gc_number text,
  category text not null,
  spec_plate_image_url text,
  ocr_text text,
  seller_height_cm numeric,
  seller_width_cm numeric,
  seller_depth_cm numeric,
  seller_weight_kg numeric,
  seller_forklift_required boolean,
  seller_condition_notes text,
  power_type text,
  voltage text,
  phase integer,
  current_a numeric,
  gas_type text,
  gas_connection text,
  source_url text,
  source_name text,
  source_type public.equipment_spec_source_type not null default 'Other',
  confidence integer not null default 0 check (confidence between 0 and 100),
  verification_status text not null default 'pending',
  moderation_notes text,
  conflict_details text,
  last_checked date,
  reported_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listing_equipment_specs
  add column if not exists equipment_spec_id uuid references public."EquipmentSpecs"(id) on delete set null,
  add column if not exists seller_id uuid,
  add column if not exists serial_number text,
  add column if not exists gc_number text,
  add column if not exists spec_plate_image_url text,
  add column if not exists ocr_text text,
  add column if not exists seller_height_cm numeric,
  add column if not exists seller_width_cm numeric,
  add column if not exists seller_depth_cm numeric,
  add column if not exists seller_weight_kg numeric,
  add column if not exists seller_forklift_required boolean,
  add column if not exists seller_condition_notes text,
  add column if not exists power_type text,
  add column if not exists voltage text,
  add column if not exists phase integer,
  add column if not exists current_a numeric,
  add column if not exists gas_type text,
  add column if not exists gas_connection text,
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists source_type public.equipment_spec_source_type not null default 'Other',
  add column if not exists confidence integer not null default 0,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists moderation_notes text,
  add column if not exists conflict_details text,
  add column if not exists last_checked date,
  add column if not exists reported_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.listing_equipment_specs
  drop constraint if exists listing_equipment_specs_verification_status_check;

alter table public.listing_equipment_specs
  add constraint listing_equipment_specs_verification_status_check check (
    verification_status in ('pending', 'verified', 'unverified', 'needs_review', 'conflicting', 'reported')
  );

create table if not exists public.equipment_spec_reports (
  id uuid primary key default gen_random_uuid(),
  equipment_spec_id uuid references public."EquipmentSpecs"(id) on delete cascade,
  listing_id text,
  reporter_id uuid,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.equipment_spec_jobs (
  id uuid primary key default gen_random_uuid(),
  listing_id text,
  equipment_spec_id uuid references public."EquipmentSpecs"(id) on delete cascade,
  job_type text not null default 'recheck',
  status text not null default 'queued',
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists listing_equipment_specs_listing_id_idx on public.listing_equipment_specs (listing_id);
create index if not exists listing_equipment_specs_equipment_spec_id_idx on public.listing_equipment_specs (equipment_spec_id);
create index if not exists listing_equipment_specs_seller_id_idx on public.listing_equipment_specs (seller_id);
create index if not exists listing_equipment_specs_status_idx on public.listing_equipment_specs (verification_status);
create index if not exists equipment_spec_reports_listing_id_idx on public.equipment_spec_reports (listing_id);
create index if not exists equipment_spec_reports_spec_id_idx on public.equipment_spec_reports (equipment_spec_id);
create index if not exists equipment_spec_reports_reporter_id_idx on public.equipment_spec_reports (reporter_id);
create index if not exists equipment_spec_jobs_run_after_idx on public.equipment_spec_jobs (run_after, status);
create index if not exists equipment_spec_jobs_spec_id_idx on public.equipment_spec_jobs (equipment_spec_id);
create index if not exists sources_domain_idx on public."Sources" (domain);

alter table public."Sources" enable row level security;
alter table public."EquipmentSpecs" enable row level security;
alter table public.listing_equipment_specs enable row level security;
alter table public.equipment_spec_reports enable row level security;
alter table public.equipment_spec_jobs enable row level security;

drop policy if exists "Anyone can view equipment spec sources" on public."Sources";
create policy "Anyone can view equipment spec sources"
on public."Sources"
for select
using (true);

drop policy if exists "Service role can manage equipment spec sources" on public."Sources";
create policy "Service role can manage equipment spec sources"
on public."Sources"
for all
to service_role
using (true)
with check (true);

drop policy if exists "Anyone can view equipment specs" on public."EquipmentSpecs";
create policy "Anyone can view equipment specs"
on public."EquipmentSpecs"
for select
using (true);

drop policy if exists "Service role can manage equipment specs" on public."EquipmentSpecs";
create policy "Service role can manage equipment specs"
on public."EquipmentSpecs"
for all
to service_role
using (true)
with check (true);

drop policy if exists "Anyone can view listing equipment specs" on public.listing_equipment_specs;
create policy "Anyone can view listing equipment specs"
on public.listing_equipment_specs
for select
using (true);

drop policy if exists "Sellers can insert listing equipment specs" on public.listing_equipment_specs;
create policy "Sellers can insert listing equipment specs"
on public.listing_equipment_specs
for insert
to authenticated
with check (seller_id = auth.uid());

drop policy if exists "Sellers can update listing equipment specs" on public.listing_equipment_specs;
create policy "Sellers can update listing equipment specs"
on public.listing_equipment_specs
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists "Service role can manage listing equipment specs" on public.listing_equipment_specs;
create policy "Service role can manage listing equipment specs"
on public.listing_equipment_specs
for all
to service_role
using (true)
with check (true);

drop policy if exists "Authenticated users can report equipment specs" on public.equipment_spec_reports;
create policy "Authenticated users can report equipment specs"
on public.equipment_spec_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Users can view their own equipment spec reports" on public.equipment_spec_reports;
create policy "Users can view their own equipment spec reports"
on public.equipment_spec_reports
for select
to authenticated
using (reporter_id = auth.uid());

drop policy if exists "Service role can manage equipment spec reports" on public.equipment_spec_reports;
create policy "Service role can manage equipment spec reports"
on public.equipment_spec_reports
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage equipment spec jobs" on public.equipment_spec_jobs;
create policy "Service role can manage equipment spec jobs"
on public.equipment_spec_jobs
for all
to service_role
using (true)
with check (true);
