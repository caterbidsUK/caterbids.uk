import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, Filter, Search, Tag } from "lucide-react"
import type { ReactNode } from "react"
import { BlogFooter, BlogHeader } from "@/components/BlogChrome"
import { createClient } from "@/lib/supabase/server"
import { formatBlogDate, plainTextFromArticle, type BlogPost } from "@/lib/blog"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "CaterBidsUK Blog | Catering Equipment News, Selling Tips & Marketplace Guides",
  description:
    "Practical advice for UK restaurants, cafes, takeaways, dealers and hospitality operators buying and selling commercial catering equipment.",
  openGraph: {
    title: "CaterBidsUK Blog",
    description:
      "UK catering equipment news, selling tips and marketplace guides from CaterBidsUK.",
    url: "https://www.caterbids.uk/blog",
    siteName: "CaterBidsUK",
    type: "website",
  },
}

type BlogPageProps = {
  searchParams?: Promise<{ category?: string }>
}

async function loadPublishedPosts() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(48)

    if (error) {
      console.warn("Published blog posts unavailable:", error.message || error)
      return [] as BlogPost[]
    }

    return (data || []) as BlogPost[]
  } catch (error) {
    console.warn("Blog data unavailable:", error)
    return [] as BlogPost[]
  }
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) || {}
  const selectedCategory = typeof params.category === "string" ? params.category : ""
  const posts = await loadPublishedPosts()
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort()
  const visiblePosts = selectedCategory ? posts.filter((post) => post.category === selectedCategory) : posts

  return (
    <main className="min-h-screen bg-[#001A35] text-white">
      <BlogHeader />

      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.18),transparent_34%),linear-gradient(135deg,#001A35_0%,#002E5D_62%,#001427_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#FFB37A]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              CaterBidsUK Blog
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl">
              UK Catering Equipment News, Selling Tips & Marketplace Guides
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-white/72">
              Practical advice for UK restaurants, cafes, takeaways, dealers and hospitality operators buying and
              selling commercial catering equipment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-6 text-base font-black text-white shadow-[0_20px_50px_rgba(255,107,0,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
              >
                Marketplace Opening Soon
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/#launch-list"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/8 px-6 text-base font-black text-white transition hover:border-[#FF6B00]/70 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                Seller Early Access
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/12 bg-white/8 p-6 shadow-2xl backdrop-blur-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow-[0_18px_45px_rgba(255,107,0,0.28)]">
              <Search className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-black">Built for real marketplace decisions</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/65">
              Guides are written for UK catering operators comparing equipment, preparing listings, handling delivery
              and making confident buying decisions.
            </p>
          </aside>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#FF6B00]">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Categories
              </span>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">Latest blog posts</h2>
            </div>
            <p className="text-sm font-semibold text-white/55">
              {visiblePosts.length} published article{visiblePosts.length === 1 ? "" : "s"}
            </p>
          </div>

          <nav className="mt-6 flex gap-3 overflow-x-auto pb-2" aria-label="Blog categories">
            <CategoryPill href="/blog" active={!selectedCategory}>
              All
            </CategoryPill>
            {categories.map((category) => (
              <CategoryPill key={category} href={`/blog?category=${encodeURIComponent(category)}`} active={selectedCategory === category}>
                {category}
              </CategoryPill>
            ))}
          </nav>

          {visiblePosts.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <section className="mt-8 rounded-[2rem] border border-white/12 bg-[#062747] p-8 text-center shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B00]/16 text-[#FF6B00]">
                <BookOpen className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black">No published guides yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-white/62">
                Published CaterBidsUK guides will appear here once Make.com starts posting into the shared marketplace
                app.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/marketplace" className="rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white">
                  Marketplace Opening Soon
                </Link>
                <Link href="/#launch-list" className="rounded-2xl border border-white/18 px-5 py-3 text-sm font-black text-white">
                  Seller Early Access
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>

      <BlogFooter />
    </main>
  )
}

function CategoryPill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-5 py-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30 ${
        active
          ? "bg-[#FF6B00] text-white shadow-[0_16px_34px_rgba(255,107,0,0.24)]"
          : "border border-white/12 bg-white/8 text-white/72 hover:border-[#FF6B00]/55 hover:text-white"
      }`}
    >
      {children}
    </Link>
  )
}

function BlogCard({ post }: { post: BlogPost }) {
  const excerpt = post.meta_description || plainTextFromArticle(post).slice(0, 160)

  return (
    <article className="flex min-h-[22rem] flex-col rounded-[2rem] border border-white/12 bg-[#062747] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-[#FF6B00]/45">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/35 bg-[#FF6B00]/12 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#FFB37A]">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {post.category}
        </span>
        <time dateTime={post.published_at || post.created_at} className="text-xs font-bold text-white/48">
          {formatBlogDate(post.published_at || post.created_at)}
        </time>
      </div>

      <h3 className="mt-5 text-2xl font-black leading-tight tracking-[-0.025em] text-white">{post.title}</h3>
      <p className="mt-4 line-clamp-4 text-sm font-semibold leading-relaxed text-white/62">{excerpt}</p>

      <Link
        href={`/blog/${post.slug}`}
        className="mt-auto inline-flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:border-[#FF6B00]/55 hover:text-[#FFB37A] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/20"
      >
        Read article
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  )
}
