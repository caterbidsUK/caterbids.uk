# CaterBidsUK Coming Soon Static Site

This folder is a standalone static landing page for DigitalOcean App Platform Static Site hosting.

It does not require Next.js, server functions, Vercel, Stripe, or service-role secrets.

## Files

- `index.html` - coming soon landing page
- `privacy.html` - waitlist privacy information
- `terms.html` - pre-launch terms
- `contact.html` - contact page
- `assets/css/styles.css` - styling
- `assets/js/config.js` - public Supabase config
- `assets/js/waitlist.js` - browser-side waitlist signup using Supabase REST

## Supabase Waitlist Setup

Create a public insert-only waitlist table in Supabase:

```sql
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'coming_soon_landing_page',
  consent_to_updates boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists waitlist_signups_email_uidx
on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

drop policy if exists "Anyone can join waitlist" on public.waitlist_signups;
create policy "Anyone can join waitlist"
on public.waitlist_signups
for insert
to anon
with check (
  email is not null
  and length(email) <= 320
  and source = 'coming_soon_landing_page'
  and consent_to_updates is true
);
```

Then edit `assets/js/config.js` and add only:

- Supabase project URL
- Supabase anon public key

Never add `SUPABASE_SERVICE_ROLE_KEY` to this static folder.
