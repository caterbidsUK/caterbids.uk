alter table public.listings
  add column if not exists weight_kg numeric,
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists collection_postcode text,
  add column if not exists pallet_ready boolean default false,
  add column if not exists tail_lift_required boolean default true,
  add column if not exists forklift_available boolean default false,
  add column if not exists ground_floor_collection boolean default true,
  add column if not exists commercial_premises boolean default false,
  add column if not exists delivery_available boolean default true;
