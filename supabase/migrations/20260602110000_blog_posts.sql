create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  category text not null,
  target_keywords text[],
  meta_title text not null,
  meta_description text not null,
  article_html text,
  article_markdown text,
  image_prompt text,
  cta text,
  source_title text,
  source_url text,
  facebook_post text,
  linkedin_post text,
  x_post text,
  instagram_caption text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists blog_posts_slug_key on public.blog_posts (slug);
create index if not exists blog_posts_status_published_at_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts (category);

alter table public.blog_posts enable row level security;

drop policy if exists "Published blog posts are public" on public.blog_posts;
create policy "Published blog posts are public"
on public.blog_posts
for select
to anon, authenticated
using (status = 'published');

create or replace function public.set_blog_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.set_blog_posts_updated_at();
