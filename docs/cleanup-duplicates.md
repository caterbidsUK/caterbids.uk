# Supabase Duplicate Cleanup

## Safe SQL Query

Run this in Supabase SQL Editor to delete duplicates, keeping the oldest listing per unique (title, price, location, category, user_id):

```sql
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, price, location, category, user_id
      ORDER BY created_at ASC
    ) AS rn
  FROM listings
)
DELETE FROM listings
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## Table Creation (if not exists)

```sql
CREATE TABLE listings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  price text NOT NULL,
  location text NOT NULL,
  category text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  description text,
  condition text,
  image_url text
);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policies (adjust as needed)
CREATE POLICY "Users can insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all listings" ON listings
  FOR SELECT USING (true);

CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id);
```

## API Usage

POST `/api/cleanup-duplicates`
Header: `Authorization: Bearer [your-secret]`

Set `CLEANUP_SECRET` in .env.local for API protection.

