export type BlogPost = {
  id: string
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
  status: string
  created_at: string
  updated_at: string
  published_at: string | null
}

const SAFE_ARTICLE_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
])

const BLOCKED_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "svg",
  "math",
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function isSafeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:"
  } catch {
    return false
  }
}

function sanitizeAttributes(tag: string, attributes: string) {
  const allowed: string[] = []
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(attributes)) !== null) {
    const name = match[1].toLowerCase()
    const value = match[3] ?? match[4] ?? match[5] ?? ""

    if (name.startsWith("on") || name === "style") continue

    if (tag === "a" && name === "href" && isSafeUrl(value)) {
      allowed.push(`href="${escapeHtml(value)}"`)
      allowed.push('rel="noopener noreferrer nofollow"')
      continue
    }

    if (tag === "img" && name === "src" && isSafeUrl(value)) {
      allowed.push(`src="${escapeHtml(value)}"`)
      allowed.push('loading="lazy"')
      continue
    }

    if ((tag === "img" && name === "alt") || name === "title") {
      allowed.push(`${name}="${escapeHtml(value)}"`)
    }
  }

  return allowed.length ? ` ${Array.from(new Set(allowed)).join(" ")}` : ""
}

export function sanitizeArticleHtml(input: string) {
  if (!input.trim()) return ""

  const blocked = BLOCKED_TAGS.join("|")
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(new RegExp(`<\\s*(${blocked})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, "gi"), "")
    .replace(new RegExp(`<\\s*\\/?\\s*(${blocked})\\b[^>]*>`, "gi"), "")
    .replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')?\s*javascript:[^"'\s>]*/gi, "")

  html = html.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, rawTag, rawAttributes) => {
    const tag = String(rawTag).toLowerCase()
    if (!SAFE_ARTICLE_TAGS.has(tag)) return ""
    if (match.startsWith("</")) return `</${tag}>`

    const attributes = sanitizeAttributes(tag, String(rawAttributes || ""))
    return `<${tag}${attributes}>`
  })

  return html.trim()
}

export function markdownToArticleHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const html: string[] = []
  let listOpen = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      if (listOpen) {
        html.push("</ul>")
        listOpen = false
      }
      continue
    }

    if (line.startsWith("### ")) {
      if (listOpen) {
        html.push("</ul>")
        listOpen = false
      }
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`)
      continue
    }

    if (line.startsWith("## ")) {
      if (listOpen) {
        html.push("</ul>")
        listOpen = false
      }
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`)
      continue
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!listOpen) {
        html.push("<ul>")
        listOpen = true
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`)
      continue
    }

    if (listOpen) {
      html.push("</ul>")
      listOpen = false
    }
    html.push(`<p>${escapeHtml(line)}</p>`)
  }

  if (listOpen) html.push("</ul>")
  return html.join("\n")
}

export function plainTextFromArticle(post: Pick<BlogPost, "article_html" | "article_markdown" | "meta_description">) {
  const source = post.article_html || markdownToArticleHtml(post.article_markdown || "") || post.meta_description || ""
  return sanitizeArticleHtml(source)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normaliseBlogSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)

  return slug || "caterbids-guide"
}

export function formatBlogDate(value: string | null) {
  if (!value) return "Unpublished"

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return "Unpublished"
  }
}

export function blogPostUrl(slug: string) {
  return `https://www.caterbids.uk/blog/${slug}`
}
