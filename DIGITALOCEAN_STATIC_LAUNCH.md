# CaterBidsUK DigitalOcean Static Launch

This deployment is for the standalone Coming Soon page in:

`coming-soon-static`

Do not connect this Coming Soon page to Vercel. Do not deploy it as a paid DigitalOcean Web Service.

## 1. Push the static landing page folder to GitHub

Commit and push the repository containing the `coming-soon-static` folder.

## 2. Create a DigitalOcean App Platform app

In DigitalOcean, open App Platform and create a new app.

## 3. Choose GitHub repository

Connect the GitHub repository that contains the CaterBidsUK project.

## 4. Select the static landing page source folder

When DigitalOcean asks for the source directory, select:

`coming-soon-static`

## 5. Set component type to Static Site

Set the component type to:

`Static Site`

Do not choose Web Service.

## 6. Deploy using the free static-site option

Use DigitalOcean App Platform Static Site hosting. The Coming Soon page is plain HTML/CSS/JS and does not require a build command.

Recommended settings:

- Source directory: `coming-soon-static`
- Build command: leave blank
- Output directory: `/`
- Component type: Static Site

## 7. Add `www.caterbids.uk` as the custom domain

In the DigitalOcean app settings, add:

`www.caterbids.uk`

You can add the root domain later if needed:

`caterbids.uk`

## 8. Copy the DNS record into Hostfast DNS

DigitalOcean will show the DNS record needed for the custom domain.

Copy that record into Hostfast DNS for `caterbids.uk`.

Typical setup will be a CNAME for:

`www`

pointing to the DigitalOcean hostname shown in App Platform.

Use the exact value DigitalOcean gives you.

## 9. Add Supabase public URL and anon key only if the static page requires them during build

This static page does not require build-time environment variables.

For waitlist signup, edit:

`coming-soon-static/assets/js/config.js`

Add only public Supabase values:

```js
window.CATERBIDS_STATIC_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
  waitlistTable: "waitlist_signups",
  contactEmail: "caterbidsuk@gmail.com"
};
```

Never add:

- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe secret keys
- Twilio secrets
- any private API keys

## 10. Test email signup live

After deployment:

1. Open `https://www.caterbids.uk`.
2. Enter a test email in the early access form.
3. Confirm the page shows: `You are on the CaterBidsUK early access list.`
4. Open Supabase.
5. Check `public.waitlist_signups`.
6. Confirm the test email was inserted with:
   - `source = coming_soon_landing_page`
   - `consent_to_updates = true`

## Supabase waitlist table

Run this SQL in Supabase if the waitlist table does not exist:

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

## Final check

The Coming Soon page should show:

`The UK Marketplace for Catering Equipment — BUY • SELL • SAVE`

It should remain static, free-tier compatible and separate from the full CaterBidsUK marketplace app.
