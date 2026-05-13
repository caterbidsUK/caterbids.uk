# CaterBidsUK Free Beta Launch Checklist

## Free Beta Launch Wording

Use this message consistently:

> CaterBidsUK is in free public beta — list catering equipment, vans and trailers for free.

Secondary CTA:

> List it free on CaterBidsUK before paying marketplace fees elsewhere.

## Vercel Deployment Steps

1. Push the latest code to GitHub.
2. In Vercel, create a new project from the CaterBidsUK repository.
3. Select the Next.js preset.
4. Add production environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `EBAY_APP_ID`
   - `EBAY_CERT_ID`
   - `AI_VISION_API_KEY` or `OPENAI_API_KEY` if using image AI
5. Deploy the project.
6. Open the Vercel preview URL and test search, login, listing creation, favourites and saved searches.

## Hostfast DNS Steps

1. In Vercel, add the Hostfast domain you want to use, for example `caterbids.uk` and `www.caterbids.uk`.
2. In Hostfast DNS, point the root domain to Vercel using the records Vercel shows.
3. Point `www` to Vercel using the CNAME record Vercel shows.
4. Wait for DNS to verify in Vercel.
5. Set the preferred production domain in Vercel.

## Supabase Auth Redirect Steps

1. In Supabase, open Authentication settings.
2. In Authentication > Providers, enable Google and Apple before public testing.
3. Add the Vercel production callback URL to allowed redirect URLs, for example:
   - `https://your-project.vercel.app/auth/callback`
4. Add the Hostfast production callback URL to allowed redirect URLs, for example:
   - `https://yourdomain.co.uk/auth/callback`
4. Keep local development redirects:
   - `http://127.0.0.1:3000/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Confirm Google, Apple, email signup, login and logout work on the production domain.

## Supabase Database Steps

1. Apply all migrations before launch.
2. If using Supabase SQL Editor manually, run:
   - `supabase/manual-sql/add_city_to_listings.sql`
   - `supabase/manual-sql/messages_tables.sql`
   - `supabase/manual-sql/saved_searches_and_favourites.sql`
3. Confirm Row Level Security policies are enabled.
4. Test saving a favourite and saving a search while logged in.

## iPhone Testing Checklist

1. Home page search is tappable and readable.
2. Search results cards stack cleanly.
3. Filter buttons are easy to tap.
4. Save listing redirects logged-out users to login.
5. Save this search redirects logged-out users to login.
6. Bottom mobile nav works: Home, Search, List, Saved, Account.
7. Listing upload form works.
8. Image upload and CaterBot image AI do not break layout.
9. Account, settings and messages pages fit the screen.

## Pages To Test Before Launch

1. `/`
2. `/search?q=gas%20fryer&category=equipment&city=Birmingham`
3. `/search?q=van&category=vans&city=London`
4. `/post-listing`
5. `/listing`
6. `/account`
7. `/settings`
8. `/favourites`
9. `/saved-searches`
10. `/messages`
11. `/about`
12. `/how-it-works`
13. `/safety`
14. `/contact`
15. `/legal/terms`
16. `/legal/privacy`
17. `/legal/cookies`
18. `/legal/prohibited-items`
19. `/report-listing`

## Final Prelaunch Checks

1. Run `npm run build`.
2. Confirm no private keys are used in client components.
3. Confirm eBay live results load in production.
4. Confirm Supabase reads and writes work on the production domain.
5. Confirm free beta wording appears on search.
