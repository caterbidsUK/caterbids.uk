create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid null,
  seller_id uuid null,
  listing_id uuid null,
  platform text default 'caterbids',
  participant_name text not null,
  participant_avatar text null,
  listing_title text null,
  last_message text null,
  last_message_at timestamptz default now(),
  unread_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid null,
  sender_name text null,
  body text not null,
  platform text default 'caterbids',
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "Allow authenticated users to read conversations" on conversations;
create policy "Allow authenticated users to read conversations"
on conversations for select
to authenticated
using (true);

drop policy if exists "Allow authenticated users to insert conversations" on conversations;
create policy "Allow authenticated users to insert conversations"
on conversations for insert
to authenticated
with check (true);

drop policy if exists "Allow authenticated users to update conversations" on conversations;
create policy "Allow authenticated users to update conversations"
on conversations for update
to authenticated
using (true);

drop policy if exists "Allow authenticated users to read messages" on messages;
create policy "Allow authenticated users to read messages"
on messages for select
to authenticated
using (true);

drop policy if exists "Allow authenticated users to insert messages" on messages;
create policy "Allow authenticated users to insert messages"
on messages for insert
to authenticated
with check (true);

drop policy if exists "Allow authenticated users to update messages" on messages;
create policy "Allow authenticated users to update messages"
on messages for update
to authenticated
using (true);
