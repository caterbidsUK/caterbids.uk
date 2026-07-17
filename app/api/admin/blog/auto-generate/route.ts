import "server-only"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminContext } from "@/app/admin/admin-utils"
import { normaliseBlogSlug, sanitizeArticleHtml, blogPostUrl } from "@/lib/blog"

const TOPICS = [
  "[1] Used commercial fryer buying checklist",
  "[2] 3-phase vs single-phase catering equipment explained",
  "[3] Gas safety rules when buying second-hand catering equipment",
  "[4] Best used commercial fridge brands for cafés",
  "[5] How pallet delivery works for catering equipment and what it costs",
  "[6] Buying a used catering trailer: what to check",
  "[7] Commercial dishwasher guide: Winterhalter vs Hobart vs Classeq",
  "[8] What sells fastest when closing a restaurant kitchen",
  "[9] Used ice machine buying mistakes to avoid",
  "[10] Commercial coffee machine for a café on a budget",
  "[11] Used pizza oven guide: deck vs conveyor",
  "[12] Signs a used commercial freezer is about to fail",
  "[13] How to photograph catering equipment so it sells",
  "[14] Fitting out a food van: equipment on a budget",
  "[15] Used bakery equipment: mixers, provers and ovens",
  "[16] Water softeners and scale: protecting your equipment",
  "[17] How to price used catering equipment for a quick sale",
  "[18] Used griddles and chargrills: plate condition is everything",
  "[19] Extraction canopies: rules for used buyers",
  "[20] Blast chillers explained: who needs one and used prices",
  "[21] Stainless steel prep tables and sinks: used prices",
  "[22] LPG vs natural gas appliances in mobile catering",
  "[23] Buying used equipment at restaurant closures",
  "[24] Undercounter vs upright refrigeration for small kitchens",
  "[25] Used food truck equipment checklist before first service",
  "[26] Warranty, sold-as-seen and buyer rights in used equipment",
  "[27] Moving heavy kitchen equipment without damaging it",
  "[28] Used coffee grinder and barista kit buying guide",
  "[29] Commercial microwave vs domestic: why it matters",
  "[30] Timing equipment purchases and sales around the tax year",
]

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.BLOG_CRON_SECRET
  const provided = request.headers.get("x-cron-secret")
  if (cronSecret && provided === cronSecret) return true
  try {
    const context = await getAdminContext()
    return context !== null
  } catch {
    return false
  }
}

async function resolveFlashModel(apiKey: string): Promise<string> {
  const FALLBACK = "gemini-2.0-flash"
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
    )
    if (!res.ok) return FALLBACK
    const data = await res.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> }
    const all = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
    console.log("auto-generate: available Gemini models:", all.join(", "))

    // Prefer an explicit "-latest" flash alias
    const latest = all.find((n) => /flash-latest$/i.test(n))
    if (latest) {
      console.log("auto-generate: selected model (latest alias):", latest)
      return latest
    }

    // Otherwise pick the lexicographically newest non-experimental flash model
    const flashes = all
      .filter((n) => /flash/i.test(n) && !/lite/i.test(n) && !/experimental/i.test(n))
      .sort()
      .reverse()
    const chosen = flashes[0] ?? FALLBACK
    console.log("auto-generate: selected model:", chosen)
    return chosen
  } catch {
    return FALLBACK
  }
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 400)}`)
  }
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  if (!text) throw new Error("Gemini returned empty response")
  return text
}

function parseJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]+\}/)
    if (match) return JSON.parse(match[0])
    throw new Error("Could not parse Gemini JSON response")
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 })
  }

  const model = await resolveFlashModel(apiKey)

  const admin = createAdminClient()
  const { data: existingPosts } = await (admin.from("blog_posts" as any) as any)
    .select("title,slug")
    .order("created_at", { ascending: false })

  const existingTitles: string[] = (existingPosts || []).map((p: any) => String(p.title || "")).filter(Boolean)
  const existingSlugs = new Set<string>((existingPosts || []).map((p: any) => String(p.slug || "")).filter(Boolean))

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/London",
  })

  const topicPrompt = `You are a content editor for CaterBids.uk, a UK peer-to-peer marketplace for used commercial catering equipment.

Today's date: ${today}

EXISTING BLOG POST TITLES — do not repeat these topics or close variants:
${existingTitles.map((t) => `- ${t}`).join("\n") || "- (none yet)"}

ORDERED TOPIC LIST — pick the FIRST topic not already covered by the existing posts:
${TOPICS.join("\n")}

BANNED TOPICS — never write about these even if they appear in the list:
- Any general "buying and selling catering equipment" overview
- Any combi oven topic (a full cluster already exists)

Your task: pick the FIRST topic from the list above that is not semantically similar to any existing post.

Return a JSON object ONLY — no markdown, no explanation, no code fence:
{
  "topicNumber": <integer 1-30>,
  "topicTitle": "<exact topic text from the list>",
  "proposedTitle": "<SEO-optimised blog post title including primary keyword, under 65 characters>",
  "proposedSlug": "<url-slug, lowercase, hyphens only, max 80 chars>",
  "proposedMetaDescription": "<meta description 140-160 characters>",
  "proposedKeywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "primaryKeyword": "<the single primary keyword phrase>"
}`

  let topicData: Record<string, unknown>
  try {
    topicData = parseJson(await callGemini(topicPrompt, apiKey, model))
  } catch (err) {
    console.error("auto-generate: topic selection failed:", err)
    return NextResponse.json({ error: "Topic selection failed: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }

  const topicNumber = Number(topicData.topicNumber) || 0
  const topicTitle = String(topicData.topicTitle || "")
  const proposedTitle = String(topicData.proposedTitle || "")
  const proposedMetaDescription = String(topicData.proposedMetaDescription || "")
  const primaryKeyword = String(topicData.primaryKeyword || topicTitle)
  const proposedKeywords = Array.isArray(topicData.proposedKeywords)
    ? (topicData.proposedKeywords as unknown[]).map(String).filter(Boolean)
    : []

  if (!proposedTitle || !topicTitle) {
    return NextResponse.json({ error: "Gemini did not return a valid topic selection" }, { status: 500 })
  }

  const slug = normaliseBlogSlug(String(topicData.proposedSlug || proposedTitle))

  if (existingSlugs.has(slug)) {
    return NextResponse.json(
      { error: `Slug already exists: ${slug}. Aborting to avoid duplicate.` },
      { status: 409 }
    )
  }

  const articlePrompt = `Write a blog post for CaterBids.uk, a UK peer-to-peer marketplace for used commercial catering equipment.

Title: ${proposedTitle}
Topic: ${topicTitle}
Primary keyword: ${primaryKeyword}
Today's date: ${today}

REQUIREMENTS:
- 900 to 1300 words total
- UK English throughout (colour, centre, per cent, etc.)
- Plain practical trade voice, written for working operators not general consumers
- Include the primary keyword within the first 100 words
- Include the primary keyword naturally in at least one H2 heading
- Follow the natural structure of the topic — no rigid template
- Include at least one actionable checklist or numbered step list using ul or ol
- Use concrete examples: real UK brands where relevant, price ranges clearly labelled as approximate market guidance
- Never invent statistics or percentages

BANNED PHRASES — do not use these at all:
- Maximising (or Maximizing)
- Scaling Your Kitchen
- the kitchen is the heart of
- the kitchen is the engine room
- circular economy
- No em dashes anywhere in the article

INTERNAL LINKS — use natural anchor text, never the raw path as visible text:
- /marketplace — link when mentioning buying or browsing equipment
- /post-listing — link when mentioning listing or selling equipment
- /pallet-delivery-guide — link when mentioning moving or delivery
- /blog — link occasionally when suggesting more reading

BRAND AND CTA:
- Mention CaterBids.uk or CaterBids naturally 2 or 3 times
- Include "BUY • SELL • SAVE" exactly once, near the end
- End with a clear call to action pointing to the CaterBids marketplace or listing page

LEGAL AND SAFETY:
- No legal, financial or safety guarantees
- Any mention of gas appliances: include "Gas Safe registered engineer"
- Any mention of electrical work: include "qualified electrician"

HTML FORMAT — use ONLY these tags: h2, h3, p, ul, ol, li, strong, em, a
- h2 for main section headings
- h3 for sub-sections if needed
- strong for key terms and important points within sentences
- Links must use safe paths: <a href="/marketplace">text</a>
- No inline styles, no class attributes, no div or span tags

Return a JSON object ONLY — no markdown, no explanation, no code fence:
{
  "articleHtml": "<h2>...</h2>\\n<p>...</p>\\n..."
}`

  let articleData: Record<string, unknown>
  try {
    articleData = parseJson(await callGemini(articlePrompt, apiKey, model))
  } catch (err) {
    console.error("auto-generate: article generation failed:", err)
    return NextResponse.json({ error: "Article generation failed: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }

  const rawHtml = String(articleData.articleHtml || "")
  if (!rawHtml) {
    return NextResponse.json({ error: "Gemini returned empty article HTML" }, { status: 500 })
  }

  const articleHtml = sanitizeArticleHtml(rawHtml)

  const now = new Date().toISOString()
  const { error: insertError } = await (admin.from("blog_posts" as any) as any).insert({
    title: proposedTitle,
    slug,
    category: "Equipment Guides",
    meta_title: proposedTitle,
    meta_description: proposedMetaDescription,
    target_keywords: proposedKeywords.length ? proposedKeywords : null,
    article_html: articleHtml,
    article_markdown: null,
    image_prompt: null,
    cta: null,
    source_title: null,
    source_url: null,
    facebook_post: null,
    linkedin_post: null,
    x_post: null,
    instagram_caption: null,
    status: "published",
    created_at: now,
    updated_at: now,
    published_at: now,
  })

  if (insertError) {
    console.error("auto-generate: insert failed:", insertError)
    return NextResponse.json({ error: "Database insert failed: " + insertError.message }, { status: 500 })
  }

  return NextResponse.json({ url: blogPostUrl(slug), title: proposedTitle, topicNumber })
}
