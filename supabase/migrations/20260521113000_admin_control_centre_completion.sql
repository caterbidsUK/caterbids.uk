alter table public.admin_audit_logs
  add column if not exists admin_id uuid references auth.users(id) on delete set null,
  add column if not exists admin_email text,
  add column if not exists target_table text,
  add column if not exists target_id text,
  add column if not exists details jsonb not null default '{}'::jsonb;

update public.admin_audit_logs
set
  admin_id = coalesce(admin_id, admin_user_id),
  target_table = coalesce(target_table, entity_type),
  target_id = coalesce(target_id, entity_id),
  details = case
    when details is null or details = '{}'::jsonb then coalesce(metadata, '{}'::jsonb)
    else details
  end
where admin_id is null
   or target_table is null
   or target_id is null
   or details is null
   or details = '{}'::jsonb;

create index if not exists admin_audit_logs_admin_id_idx
on public.admin_audit_logs (admin_id);

create index if not exists admin_audit_logs_target_idx
on public.admin_audit_logs (target_table, target_id);

alter table public.listings
  add column if not exists urgent boolean default false,
  add column if not exists is_urgent boolean default false;

create index if not exists listings_urgent_created_at_idx
on public.listings (urgent, created_at desc);

insert into public.site_settings (key, value, description)
values
  ('maintenance_mode', '{"text":"false","value":false,"type":"boolean"}'::jsonb, 'Temporarily hide public selling/listing actions while testing.'),
  ('free_listing_limit', '{"text":"100","value":100,"type":"number"}'::jsonb, 'Number of launch listings offered free.'),
  ('single_listing_price', '{"text":"7","value":7,"type":"number"}'::jsonb, 'Price for one standard listing.'),
  ('premium_listing_price', '{"text":"15","value":15,"type":"number"}'::jsonb, 'Price for premium listing options.'),
  ('monthly_20_listings_plan', '{"text":"19","value":19,"type":"number"}'::jsonb, 'Monthly seller plan for up to 20 listings.'),
  ('monthly_50_listings_plan', '{"text":"49","value":49,"type":"number"}'::jsonb, 'Monthly seller plan for up to 50 listings.')
on conflict (key) do nothing;

update public.profiles
set role = 'super_admin',
    updated_at = now()
where lower(email) = 'caterbidsuk@gmail.com'
  and role is distinct from 'super_admin';
