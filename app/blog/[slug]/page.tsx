import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Tag } from "lucide-react"
import { BlogFooter, BlogHeader } from "@/components/BlogChrome"
import {
  blogPostUrl,
  formatBlogDate,
  markdownToArticleHtml,
  sanitizeArticleHtml,
  type BlogPost,
} from "@/lib/blog"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
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

    return data as BlogPost | null
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
  const description = post.meta_description
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
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await loadPost(slug)

  if (!post) notFound()

  const articleHtml = sanitizeArticleHtml(post.article_html || markdownToArticleHtml(post.article_markdown || ""))
  const sourceIsSafe = isSafeSourceUrl(post.source_url)

  return (
    <main className="min-h-screen bg-[#001A35] text-white">
      <BlogHeader />

      <article className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white/76 transition hover:border-[#FF6B00]/55 hover:text-white focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to blog
          </Link>

          <header className="mt-8 rounded-[2rem] border border-white/12 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.18),transparent_38%),linear-gradient(135deg,#062747,#082D50)] p-6 shadow-2xl sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/12 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#FFB37A]">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                {post.category}
              </span>
              <time
                dateTime={post.published_at || post.created_at}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold text-white/60"
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatBlogDate(post.published_at || post.created_at)}
              </time>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 text-lg font-semibold leading-relaxed text-white/68">{post.meta_description}</p>
          </header>

          <section
            className="mt-6 rounded-[2rem] border border-white/12 bg-white p-6 text-[#001A35] shadow-2xl sm:p-9 [&_a]:font-black [&_a]:text-[#FF6B00] [&_blockquote]:border-l-4 [&_blockquote]:border-[#FF6B00] [&_blockquote]:bg-[#FFF4EC] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-semibold [&_code]:rounded-lg [&_code]:bg-slate-100 [&_code]:px-1.5 [&_h2]:mt-9 [&_h2]:text-3xl [&_h2]:font-black [&_h3]:mt-7 [&_h3]:text-2xl [&_h3]:font-black [&_img]:my-6 [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200 [&_li]:my-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:font-semibold [&_p]:leading-8 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-white [&_strong]:font-black [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
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

          <section className="mt-6 rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,#062747,#001A35)] p-6 shadow-2xl sm:p-8">
            <h2 className="text-3xl font-black tracking-[-0.035em]">Buy, Sell & Save on Catering Equipment</h2>
            <p className="mt-3 text-base font-semibold leading-relaxed text-white/68">
              CaterBids.uk helps UK restaurants, cafes, takeaways, dealers and hospitality operators buy and sell
              commercial catering equipment with confidence.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-6 text-sm font-black text-white transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
              >
                Browse the marketplace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/18 bg-white/8 px-6 text-sm font-black text-white transition hover:border-[#FF6B00]/60 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                Sell your equipment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </article>

      <BlogFooter />
    </main>
  )
}
