import { NextResponse } from "next/server"
import { blogPostUrl, normaliseBlogSlug, sanitizeArticleHtml } from "@/lib/blog"
import { createAdminClient } from "@/lib/supabase/admin"

type BlogPostInsert = {
  title: string
  slug: string
  category: string
  target_keywords: string[] | null
  meta_title: string
  meta_description: string
  article_html: string | null
  article_markdown: string | null
  image_prompt: string | null
  cta: string | null
  source_title: string | null
  source_url: string | null
  facebook_post: string | null
  linkedin_post: string | null
  x_post: string | null
  instagram_caption: string | null
  featured_image_url: string | null
  image_alt: string | null
  status: string
  created_at: string
  updated_at: string
  published_at: string
}

type BlogPostSlugRow = {
  slug: string
}

type BlogPostsQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<{ data: BlogPostSlugRow | null; error: { message: string } | null }>
    }
  }
  insert(payload: BlogPostInsert): Promise<{ error: { message: string } | null }>
}

type BlogAdminClient = {
  from(table: "blog_posts"): BlogPostsQuery
}

type BlogCreateRequest = {
  title?: unknown
  slug?: unknown
  category?: unknown
  targetKeywords?: unknown
  metaTitle?: unknown
  metaDescription?: unknown
  articleHtml?: unknown
  articleMarkdown?: unknown
  imagePrompt?: unknown
  cta?: unknown
  sourceTitle?: unknown
  sourceUrl?: unknown
  facebookPost?: unknown
  linkedinPost?: unknown
  xPost?: unknown
  instagramCaption?: unknown
  featuredImageUrl?: unknown
  imageAlt?: unknown
  status?: unknown
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function cleanOptionalString(value: unknown) {
  const cleaned = cleanString(value)
  return cleaned || null
}

function normaliseKeywords(value: unknown) {
  if (Array.isArray(value)) {
    const keywords = value.map(cleanString).filter(Boolean)
    return keywords.length ? keywords : null
  }

  const stringValue = cleanString(value)
  if (!stringValue) return null

  const keywords = stringValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return keywords.length ? keywords : [stringValue]
}

function safeHttpUrl(value: unknown) {
  const cleaned = cleanString(value)
  if (!cleaned) return null

  try {
    const parsed = new URL(cleaned)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? cleaned : null
  } catch {
    return null
  }
}

async function uniqueSlug(baseSlug: string) {
  const supabase = createAdminClient() as unknown as BlogAdminClient
  const { data, error } = await supabase.from("blog_posts").select("slug").eq("slug", baseSlug).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return { supabase, slug: baseSlug }

  return {
    supabase,
    slug: `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`,
  }
}

export async function POST(request: Request) {
  const expectedKey = process.env.CATERBIDS_BLOG_API_KEY
  const providedKey = request.headers.get("x-caterbids-api-key")

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: BlogCreateRequest
  try {
    body = (await request.json()) as BlogCreateRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const title = cleanString(body.title)
  const category = cleanString(body.category)
  const metaTitle = cleanString(body.metaTitle)
  const metaDescription = cleanString(body.metaDescription)
  const articleMarkdown = cleanOptionalString(body.articleMarkdown)
  const articleHtml = cleanString(body.articleHtml)
  const sanitizedArticleHtml = articleHtml ? sanitizeArticleHtml(articleHtml) : null

  const missingFields = [
    !title ? "title" : "",
    !category ? "category" : "",
    !metaTitle ? "metaTitle" : "",
    !metaDescription ? "metaDescription" : "",
    !sanitizedArticleHtml && !articleMarkdown ? "articleHtml or articleMarkdown" : "",
  ].filter(Boolean)

  if (missingFields.length) {
    return NextResponse.json({ error: "Missing required fields", missingFields }, { status: 400 })
  }

  const baseSlug = normaliseBlogSlug(cleanString(body.slug) || title)
  const now = new Date().toISOString()

  try {
    const { supabase, slug } = await uniqueSlug(baseSlug)
    const payload: BlogPostInsert = {
      title,
      slug,
      category,
      target_keywords: normaliseKeywords(body.targetKeywords),
      meta_title: metaTitle,
      meta_description: metaDescription,
      article_html: sanitizedArticleHtml,
      article_markdown: articleMarkdown,
      image_prompt: cleanOptionalString(body.imagePrompt),
      cta: cleanOptionalString(body.cta),
      source_title: cleanOptionalString(body.sourceTitle),
      source_url: safeHttpUrl(body.sourceUrl),
      facebook_post: cleanOptionalString(body.facebookPost),
      linkedin_post: cleanOptionalString(body.linkedinPost),
      x_post: cleanOptionalString(body.xPost),
      instagram_caption: cleanOptionalString(body.instagramCaption),
      featured_image_url: safeHttpUrl(body.featuredImageUrl),
      image_alt: cleanOptionalString(body.imageAlt),
      status: "published",
      created_at: now,
      updated_at: now,
      published_at: now,
    }

    const { error } = await supabase.from("blog_posts").insert(payload)

    if (error) {
      console.warn("Blog publish insert failed:", error.message || error)
      return NextResponse.json({ error: "Unable to create blog post" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: blogPostUrl(slug),
      slug,
    })
  } catch (error) {
    console.warn("Blog publish failed:", error)
    return NextResponse.json({ error: "Unable to create blog post" }, { status: 500 })
  }
}
