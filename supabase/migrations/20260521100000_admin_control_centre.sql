create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists admin_audit_logs_service_role_manage on public.admin_audit_logs;
create policy admin_audit_logs_service_role_manage
on public.admin_audit_logs
for all
to service_role
using (true)
with check (true);

drop policy if exists site_settings_service_role_manage on public.site_settings;
create policy site_settings_service_role_manage
on public.site_settings
for all
to service_role
using (true)
with check (true);

create index if not exists admin_audit_logs_created_at_idx
on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_admin_user_id_idx
on public.admin_audit_logs (admin_user_id);

insert into public.site_settings (key, value, description)
values
  ('homepage_notice', '{"text": ""}'::jsonb, 'Optional homepage announcement text.'),
  ('support_email', '{"text": "support@caterbids.uk"}'::jsonb, 'Primary support contact.'),
  ('launch_offer', '{"text": "First 100 listings are free."}'::jsonb, 'Launch offer wording.')
on conflict (key) do nothing;
