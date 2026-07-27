import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Filter,
  Search,
  Tag,
} from "lucide-react"
import type { ReactNode } from "react"
import { BlogFooter, BlogHeader } from "@/components/BlogChrome"
import { createClient } from "@/lib/supabase/server"
import { formatBlogDate, plainTextFromArticle, type BlogPost } from "@/lib/blog"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Used Catering Equipment Guides, Prices & Selling Tips | CaterBids UK",
  description:
    "Practical guides on buying and selling used commercial catering equipment in the UK. Real price bands, buying checks and selling tips from CaterBids.",
  openGraph: {
    title: "Used Catering Equipment Guides, Prices & Selling Tips | CaterBids UK",
    description:
      "Practical guides on buying and selling used commercial catering equipment in the UK. Real price bands, buying checks and selling tips from CaterBids.",
    url: "https://www.caterbids.uk/blog",
    siteName: "CaterBidsUK",
    type: "website",
  },
}

type BlogPageProps = {
  searchParams?: Promise<{ category?: string }>
}

const preferredCategories = [
  "Business Advice",
  "Buyer Advice",
  "Seller Advice",
  "Industry Insights",
  "Equipment Guides",
  "Marketplace News",
]

function isDevelopment() {
  return process.env.NODE_ENV === "development"
}

function isPublicPost(post: BlogPost) {
  return isDevelopment() || post.category?.toLowerCase() !== "test"
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

    return ((data || []) as BlogPost[]).filter(isPublicPost)
  } catch (error) {
    console.warn("Blog data unavailable:", error)
    return [] as BlogPost[]
  }
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) || {}
  const selectedCategory = typeof params.category === "string" ? params.category : ""
  const posts = await loadPublishedPosts()
  const dynamicCategories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))
    .filter((category) => category.toLowerCase() !== "test")
    .sort()
  const categories = Array.from(new Set([...preferredCategories, ...dynamicCategories]))
  const visiblePosts = selectedCategory ? posts.filter((post) => post.category === selectedCategory) : posts

  return (
    <main className="min-h-screen bg-[#001B36] text-white">
      <BlogHeader />

      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.2),transparent_30%),linear-gradient(135deg,#001B36_0%,#002E5D_58%,#001326_100%)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/45 bg-[#FF6B00]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#FFB37A]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              CaterBidsUK Blog
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Buy Smarter. Sell Faster. The UK Guide to Used Catering Equipment.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-relaxed text-[#D5E0F0] sm:text-xl">
              Real prices, honest checks and selling advice for restaurants, cafés, takeaways, food vans and dealers.
              Written for the trade, not the showroom.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search?q=all&category=All%20Categories&location=All%20UK"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-6 text-base font-black text-white shadow-[0_22px_54px_rgba(255,107,0,0.3)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
              >
                Browse the Marketplace
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/post-listing/start"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/8 px-6 text-base font-black text-white transition hover:border-[#FF6B00]/70 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                Sell an Item
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="overflow-hidden rounded-[2rem] border border-white/12 bg-[#062747]/86 shadow-2xl backdrop-blur-md">
            <div className="relative aspect-[16/10] min-h-56">
              <Image
                src="/images/caterbids-hero-showroom.png"
                alt="Commercial catering equipment showroom"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,26,53,0.08),rgba(0,26,53,0.78))]" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow-[0_18px_45px_rgba(255,107,0,0.28)]">
                  <Search className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-2xl font-black">Built for real marketplace decisions</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/78">
                  Guides are written for UK catering operators comparing equipment, preparing listings, handling
                  delivery and making confident buying decisions.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#FF6B00]">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Categories
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">Latest blog posts</h2>
            </div>
            <p className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-bold text-white/65">
              {visiblePosts.length} published article{visiblePosts.length === 1 ? "" : "s"}
            </p>
          </div>

          <nav className="mt-7 flex gap-3 overflow-x-auto pb-2" aria-label="Blog categories">
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
            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <section className="mt-9 rounded-[2rem] border border-white/12 bg-[#062747] p-8 text-center shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B00]/16 text-[#FF6B00]">
                <BookOpen className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black">No published guides yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-white/62">
                Published CaterBidsUK guides will appear here once Make.com starts posting into the shared marketplace
                app.
              </p>
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
    <article className="group flex min-h-[24rem] flex-col overflow-hidden rounded-[1.75rem] border border-[#3B628F]/40 bg-[linear-gradient(180deg,#082D50,#062747)] shadow-[0_22px_80px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-[#FF6B00]/55">
      {post.featured_image_url ? (
        <Image
          src={post.featured_image_url}
          alt={post.image_alt || post.title}
          width={600}
          height={338}
          className="h-48 w-full object-cover"
        />
      ) : (
        <div className="h-2 bg-[#FF6B00]" />
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/35 bg-[#FF6B00]/12 px-3 py-2 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[#FFB37A]">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {post.category}
          </span>
          <time dateTime={post.published_at || post.created_at} className="shrink-0 text-xs font-bold text-white/52">
            {formatBlogDate(post.published_at || post.created_at)}
          </time>
        </div>

        <h3 className="mt-6 text-2xl font-black leading-tight tracking-[-0.025em] text-white">{post.title}</h3>
        <p className="mt-4 line-clamp-4 text-sm font-semibold leading-relaxed text-[#A7B5C9]">{excerpt}</p>

        <div className="mt-5 grid gap-2 text-sm font-semibold text-white/64">
          {["Practical UK advice", "Marketplace-ready guidance"].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#FF6B00]" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="mt-auto inline-flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-black text-white transition group-hover:border-[#FF6B00]/55 group-hover:text-[#FFB37A] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/20"
        >
          Read article
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

