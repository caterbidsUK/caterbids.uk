import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react"
import { BlogFooter, BlogHeader } from "@/components/BlogChrome"
import SocialShareButtons from "@/components/social/SocialShareButtons"
import {
  blogPostUrl,
  formatBlogDate,
  markdownToArticleHtml,
  plainTextFromArticle,
  sanitizeArticleHtml,
  type BlogPost,
} from "@/lib/blog"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

function isDevelopment() {
  return process.env.NODE_ENV === "development"
}

function isPublicPost(post: BlogPost) {
  return isDevelopment() || post.category?.toLowerCase() !== "test"
}

async function loadPost(slug: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()

    if (error) {
      console.warn("Blog post unavailable:", error.message || error)
      return null
    }

    const post = data as BlogPost | null
    return post && isPublicPost(post) ? post : null
  } catch (error) {
    console.warn("Blog post data unavailable:", error)
    return null
  }
}

function isSafeSourceUrl(value: string | null) {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

function readingTime(post: BlogPost) {
  const words = plainTextFromArticle(post).split(/\s+/).filter(Boolean).length
  return `${Math.max(2, Math.ceil(words / 210))} min read`
}

type SidebarListing = {
  id: string
  title: string
  price: string
  location: string
  images: string[] | null
  image_url: string | null
  featured: boolean | null
  is_featured: boolean | null
  featured_until: string | null
  seller_id: string | null
  created_at: string
}

type SidebarListingsData = { featured: SidebarListing[]; recent: SidebarListing[] }

function isActiveFeatured(l: Pick<SidebarListing, "featured" | "is_featured" | "featured_until">): boolean {
  if (!Boolean(l.featured || l.is_featured)) return false
  if (!l.featured_until) return true
  const ts = new Date(l.featured_until).getTime()
  return Number.isFinite(ts) ? ts > Date.now() : true
}

async function loadSidebarListings(): Promise<SidebarListingsData> {
  const empty: SidebarListingsData = { featured: [], recent: [] }
  try {
    const admin = createAdminClient()

    // Exclude test sellers — same two-step pattern as lib/counters.ts
    const { data: testProfiles } = await admin.from("profiles").select("id").eq("is_test", true)
    const testIds = ((testProfiles || []) as Array<{ id: string }>).map((p) => p.id)

    const SELECT = "id, title, price, location, images, image_url, featured, is_featured, featured_until, seller_id, created_at"

    // Block 1 — Featured Equipment: candidates with featured=true or is_featured=true, expiry checked in JS
    let featuredQuery = (admin.from("listings" as any) as any)
      .select(SELECT)
      .eq("status", "live")
      .or("featured.eq.true,is_featured.eq.true")
      .order("created_at", { ascending: false })
      .limit(20)
    if (testIds.length > 0) featuredQuery = featuredQuery.not("seller_id", "in", `(${testIds.join(",")})`)
    const { data: featuredRaw, error: featuredError } = await featuredQuery
    if (featuredError) throw featuredError
    const featuredListings: SidebarListing[] = ((featuredRaw || []) as SidebarListing[])
      .filter(isActiveFeatured)
      .slice(0, 3)
    const featuredIds = new Set(featuredListings.map((l) => l.id))

    // Block 2 — Recently Listed: live, ordered newest first, excluding featured listings
    let recentQuery = (admin.from("listings" as any) as any)
      .select(SELECT)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(6) // fetch up to 6 so we can exclude up to 3 featured and still have 3 recent
    if (testIds.length > 0) recentQuery = recentQuery.not("seller_id", "in", `(${testIds.join(",")})`)
    const { data: recentRaw, error: recentError } = await recentQuery
    if (recentError) throw recentError
    const recentListings: SidebarListing[] = ((recentRaw || []) as SidebarListing[])
      .filter((l) => !featuredIds.has(l.id))
      .slice(0, 3)

    return { featured: featuredListings, recent: recentListings }
  } catch (err) {
    console.error("loadSidebarListings failed:", err)
    return empty
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await loadPost(slug)

  if (!post) {
    return {
      title: "CaterBidsUK Blog",
      description: "CaterBidsUK marketplace guides and catering equipment advice.",
    }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || plainTextFromArticle(post).slice(0, 155)
  const url = blogPostUrl(post.slug)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "CaterBidsUK",
      type: "article",
      publishedTime: post.published_at || post.created_at,
      section: post.category,
      images: [post.featured_image_url || "/images/caterbids-hero-showroom.png"],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const [post, sidebarListings] = await Promise.all([loadPost(slug), loadSidebarListings()])

  if (!post) notFound()

  const articleHtml = sanitizeArticleHtml(post.article_html || markdownToArticleHtml(post.article_markdown || ""))
  const sourceIsSafe = isSafeSourceUrl(post.source_url)
  const excerpt = post.meta_description || plainTextFromArticle(post).slice(0, 180)
  const postUrl = blogPostUrl(post.slug)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: excerpt,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: {
      "@type": "Organization",
      name: "CaterBidsUK Team",
    },
    publisher: {
      "@type": "Organization",
      name: "CaterBidsUK",
      logo: {
        "@type": "ImageObject",
        url: "https://www.caterbids.uk/brand/caterbids-logo.png",
      },
    },
    image: post.featured_image_url ?? "https://www.caterbids.uk/images/caterbids-hero-showroom.png",
    mainEntityOfPage: postUrl,
  }

  return (
    <main className="min-h-screen bg-[#001B36] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogHeader />

      <article>
        <ArticleHero post={post} excerpt={excerpt} postUrl={postUrl} />

        {post.featured_image_url && (
          <div className="px-4 pt-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem]">
              <Image
                src={post.featured_image_url}
                alt={post.image_alt || post.title}
                width={1200}
                height={675}
                className="w-full object-cover"
                priority
              />
            </div>
          </div>
        )}

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="min-w-0">
              <ProTipCallout text={post.pro_tip} />

              <section
                className="mt-6 rounded-[2rem] border border-[#D6E5F7] bg-[#F8FBFF] p-6 text-[#001A35] shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-9 [&_a]:font-black [&_a]:text-[#FF6B00] [&_blockquote]:my-7 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#FF6B00] [&_blockquote]:bg-[#FFF3EA] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-semibold [&_code]:rounded-lg [&_code]:bg-slate-100 [&_code]:px-1.5 [&_h2]:relative [&_h2]:mt-10 [&_h2]:border-l-4 [&_h2]:border-[#FF6B00] [&_h2]:pl-4 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:tracking-[-0.035em] [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-black [&_img]:my-6 [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200 [&_li]:my-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:font-semibold [&_p]:leading-8 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-white [&_strong]:font-black [&_table]:my-7 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-slate-200 [&_td]:border-t [&_td]:border-slate-200 [&_td]:p-3 [&_th]:bg-[#EAF3FF] [&_th]:p-3 [&_th]:text-left [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_li::marker]:text-[#FF6B00]"
                dangerouslySetInnerHTML={{ __html: articleHtml || "<p>This article is being prepared.</p>" }}
              />

              {sourceIsSafe && (
                <section className="mt-6 rounded-[2rem] border border-white/12 bg-[#062747] p-5">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#FF6B00]">Source</h2>
                  <a
                    href={post.source_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-3 inline-flex items-center gap-2 text-base font-black text-white transition hover:text-[#FFB37A]"
                  >
                    {post.source_title || post.source_url}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </section>
              )}

              <SocialShareButtons
                title={post.title}
                url={postUrl}
                heading="Share this article"
                description="Help fellow caterers find useful content — share this article with your network."
              />

              <BottomCta />

              <EnhancedArticleBlocks />
            </div>

            <BlogSidebar sidebarListings={sidebarListings} />
          </div>
        </section>
      </article>

      <TrustStrip />
      <BlogFooter />
    </main>
  )
}

function ArticleHero({ post, excerpt, postUrl }: { post: BlogPost; excerpt: string; postUrl: string }) {
  return (
    <header className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#001B36,#002E5D_58%,#001326)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="absolute inset-y-0 right-0 hidden w-[46%] opacity-40 lg:block">
        <Image
          src="/images/caterbids-hero-showroom.png"
          alt="Commercial kitchen equipment"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#001B36,rgba(0,27,54,0.32),rgba(0,27,54,0.78))]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-black text-white/78 transition hover:border-[#FF6B00]/55 hover:text-white focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to blog
        </Link>

        <nav className="mt-7 flex flex-wrap items-center gap-2 text-xs font-bold text-white/58" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#FFB37A]">Home</Link>
          <Chevron />
          <Link href="/blog" className="hover:text-[#FFB37A]">Blog</Link>
          <Chevron />
          <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-[#FFB37A]">
            {post.category}
          </Link>
        </nav>

        <div className="mt-5 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/12 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#FFB37A]">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {post.category}
            </span>
            <time
              dateTime={post.published_at || post.created_at}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold text-white/68"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatBlogDate(post.published_at || post.created_at)}
            </time>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold text-white/68">
              <BookIcon />
              {readingTime(post)}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg font-semibold leading-relaxed text-[#D5E0F0]">{excerpt}</p>

          <div className="mt-7 flex flex-col gap-4 rounded-[1.75rem] border border-white/12 bg-white/8 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00] text-white">
                <UserCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Written by CaterBidsUK Team</p>
                <p className="text-xs font-semibold text-[#A7B5C9]">Catering Equipment Marketplace Specialists</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SocialShareButtons title={post.title} url={postUrl} inline />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-white/76 transition hover:border-[#FF6B00]/60 hover:text-[#FFB37A]"
              >
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                Save Article
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function BlogSidebar({ sidebarListings }: { sidebarListings: SidebarListingsData }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start" aria-label="Blog sidebar">
      <section className="rounded-[1.75rem] border border-white/12 bg-[#062747] p-5 shadow-2xl">
        <label htmlFor="sidebar-blog-search" className="sr-only">Search the blog</label>
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white px-4 text-[#001A35]">
          <Search className="h-5 w-5 text-[#FF6B00]" aria-hidden="true" />
          <input
            id="sidebar-blog-search"
            type="search"
            placeholder="Search the blog..."
            className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#FF6B00]/28 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.24),transparent_38%),linear-gradient(135deg,#062747,#001A35)] p-5 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00] text-white">
          <Bot className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-black">CaterBot AI Tools</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#A7B5C9]">
          Use AI to create better listings and sell faster.
        </p>
        <div className="mt-5 grid gap-3">
          {[
            { title: "Scan Spec Plate", text: "Extract model, power, dims & more", Icon: Wrench },
            { title: "Equipment Valuation", text: "Get an instant market value", Icon: Zap },
            { title: "Create Listing", text: "Let AI build your listing", Icon: ClipboardCheck },
            { title: "Delivery Guide", text: "Find the best delivery option", Icon: Truck },
          ].map(({ title, text, Icon }) => (
            <Link
              key={title}
              href="/post-listing/start"
              className="flex gap-3 rounded-2xl border border-white/12 bg-white/8 p-3 transition hover:border-[#FF6B00]/55 hover:bg-white/12"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
              <span>
                <span className="block text-sm font-black text-white">{title}</span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#A7B5C9]">{text}</span>
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/post-listing/start"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#FF6B00] px-4 text-sm font-black text-white transition hover:brightness-110"
        >
          Try CaterBot AI
        </Link>
      </section>

      <SidebarListingsBlock title="Featured Equipment" listings={sidebarListings.featured} />
      <SidebarListingsBlock title="Recently Listed" listings={sidebarListings.recent} />
      <SidebarLinks title="Categories" items={["All Categories", "Seller Advice", "Buyer Advice", "Business Advice", "Industry Insights", "Equipment Guides", "Marketplace News"]} />
      <SidebarTags />
    </aside>
  )
}


function SidebarLinks({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[1.75rem] border border-white/12 bg-[#062747] p-5 shadow-2xl">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <Link key={item} href={item === "All Categories" ? "/blog" : `/blog?category=${encodeURIComponent(item)}`} className="flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold text-[#A7B5C9] transition hover:bg-white/8 hover:text-white">
            {item}
            <ArrowRight className="h-4 w-4 text-[#FF6B00]" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function SidebarTags() {
  const tags = ["selling tips", "buying guide", "catering equipment", "restaurant", "takeaway", "combi oven", "refrigeration", "dishwashers", "valuation", "delivery", "equipment care"]
  return (
    <section className="rounded-[1.75rem] border border-white/12 bg-[#062747] p-5 shadow-2xl">
      <h2 className="text-lg font-black">Popular Tags</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link key={tag} href="/blog" className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-white/66 transition hover:border-[#FF6B00]/55 hover:text-[#FFB37A]">
            {tag}
          </Link>
        ))}
      </div>
    </section>
  )
}

function sidebarListingPhoto(listing: SidebarListing): string {
  const first = Array.isArray(listing.images) ? listing.images[0] : null
  return first || listing.image_url || "/images/caterbids-hero-showroom.png"
}

function formatSidebarPrice(price: string): string {
  const v = price.trim()
  return v.startsWith("£") ? v : `£${v}`
}

function SidebarListingCard({ listing }: { listing: SidebarListing }) {
  return (
    <Link
      href={`/listing?id=${encodeURIComponent(listing.id)}`}
      className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 transition hover:border-[#FF6B00]/55"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sidebarListingPhoto(listing)}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-black text-white">{listing.title}</span>
        <span className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-[#A7B5C9]">
          <span className="text-[#FF6B00]">{formatSidebarPrice(listing.price)}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.location}
          </span>
        </span>
      </span>
    </Link>
  )
}

function SidebarListingsBlock({ title, listings }: { title: string; listings: SidebarListing[] }) {
  if (listings.length === 0) return null
  return (
    <section className="rounded-[1.75rem] border border-white/12 bg-[#062747] p-5 shadow-2xl">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {listings.map((listing) => (
          <SidebarListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

function ProTipCallout({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) return null
  return (
    <section className="rounded-[1.75rem] border border-[#FF6B00]/28 bg-[#FFF3EA] p-5 text-[#001A35] shadow-2xl">
      <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#C45000]">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Pro Tip
      </span>
      <p className="mt-2 text-base font-bold leading-relaxed">{text}</p>
    </section>
  )
}

function EnhancedArticleBlocks() {
  const features = [
    ["Verified Buyers", UserCheck],
    ["Targeted Audience", Search],
    ["UK-Wide Exposure", MapPin],
    ["Fast Enquiries", MessageCircle],
  ] as const

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[2rem] border border-[#D6E5F7] bg-white p-6 text-[#001A35] shadow-2xl sm:p-8">
        <h2 className="text-3xl font-black tracking-[-0.035em]">Understand Your Equipment&apos;s Value</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_16rem] md:items-center">
          <p className="text-base font-semibold leading-8 text-slate-700">
            Check brand, model, age, condition, power requirements and recent comparable sales before choosing a price.
            Strong detail helps buyers compare your item with confidence.
          </p>
          <div className="rounded-3xl border border-slate-200 bg-[#EAF3FF] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Valuation snapshot</p>
            <div className="mt-4 h-28 rounded-2xl bg-[linear-gradient(180deg,#fff,#dbeafe)] p-4">
              <div className="h-full rounded-xl border-l-4 border-b-4 border-[#002E5D]">
                <div className="ml-3 mt-10 h-1.5 w-10 rounded-full bg-[#FF6B00]" />
                <div className="ml-14 mt-[-18px] h-1.5 w-12 rounded-full bg-[#FF6B00]" />
                <div className="ml-28 mt-[-26px] h-1.5 w-16 rounded-full bg-[#FF6B00]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/12 bg-[#062747] p-6 shadow-2xl sm:p-8">
        <h2 className="text-3xl font-black tracking-[-0.035em] text-white">Prepare Your Equipment</h2>
        <ul className="mt-5 grid gap-3 text-sm font-bold text-[#D5E0F0] sm:grid-cols-2">
          {["Clean stainless surfaces", "Disconnect safely", "Photograph the data plate", "Box loose parts", "Measure and weigh", "Prepare for pallet collection"].map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[2rem] border border-[#D6E5F7] bg-[#F3F8FF] p-6 text-[#001A35] shadow-2xl sm:p-8">
        <h2 className="text-3xl font-black tracking-[-0.035em]">Write a Great Listing</h2>
        <p className="mt-4 text-base font-semibold leading-8 text-slate-700">
          Lead with the equipment type, brand, model, condition and location. Add power, dimensions and delivery notes
          so serious buyers know whether the item fits their site.
        </p>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Buyer Tip</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
            Clear descriptions reduce back-and-forth messages and help buyers decide faster.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/12 bg-[#062747] p-6 shadow-2xl sm:p-8">
        <h2 className="text-3xl font-black tracking-[-0.035em] text-white">Get It Seen by Serious Buyers</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(([label, Icon]) => (
            <div key={label} className="rounded-2xl border border-white/12 bg-white/8 p-4">
              <Icon className="h-6 w-6 text-[#FF6B00]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-white">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function BottomCta() {
  return (
    <section className="mt-6 rounded-[2rem] border border-[#FF6B00]/30 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.25),transparent_34%),linear-gradient(135deg,#062747,#001A35)] p-6 shadow-2xl sm:p-8">
      <h2 className="text-3xl font-black tracking-[-0.035em]">Ready to Sell Your Equipment?</h2>
      <p className="mt-3 text-base font-semibold leading-relaxed text-[#A7B5C9]">
        List now, reach serious buyers and turn your unused equipment into cash - fast.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/post-listing/start" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#FF6B00] px-5 text-sm font-black text-white transition hover:brightness-110">
          Start Your Free Listing
        </Link>
        <Link href="/marketplace" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/18 bg-white/8 px-5 text-sm font-black text-white transition hover:border-[#FF6B00]/55">
          Browse the Marketplace
        </Link>
        <Link href="/post-listing/start" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/18 bg-white/8 px-5 text-sm font-black text-white transition hover:border-[#FF6B00]/55">
          Try CaterBot AI
        </Link>
      </div>
    </section>
  )
}

function TrustStrip() {
  const items = [
    ["Verified Sellers", "All sellers are verified for your protection.", ShieldCheck],
    ["Secure Messaging", "Chat safely within our platform.", MessageCircle],
    ["Buyer Protection", "Built-in tools to keep transactions safe.", Star],
    ["UK Focused", "Built for the UK catering industry.", MapPin],
    ["Expert Support", "Our team is here to help you succeed.", CheckCircle2],
  ] as const

  return (
    <section className="border-y border-white/10 bg-[#001A35] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(([title, text, Icon]) => (
          <div key={title} className="rounded-2xl border border-white/12 bg-white/8 p-4">
            <Icon className="h-6 w-6 text-[#FF6B00]" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-black text-white">{title}</h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#A7B5C9]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Chevron() {
  return <span className="text-white/30">/</span>
}

function BookIcon() {
  return <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
}
