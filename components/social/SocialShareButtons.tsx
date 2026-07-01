"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Mail, Share2 } from "lucide-react"

type SharePlatform = "native" | "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "copy"

type SocialShareButtonsProps = {
  listingId: string
  title: string
  price?: string | number | null
  location?: string | null
  url?: string
  compact?: boolean
  heading?: string
  description?: string
}

function encode(value: string) {
  return encodeURIComponent(value)
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  if (typeof window === "undefined") return value
  return new URL(value, window.location.origin).toString()
}

export default function SocialShareButtons({
  listingId,
  title,
  price,
  location,
  url,
  compact = false,
  heading = "Promote Listing",
  description = "Share this listing to get more views.",
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (url) return absoluteUrl(url)
    if (typeof window !== "undefined") return absoluteUrl(window.location.href)
    return `/listing?id=${listingId}`
  }, [listingId, url])
  const shareText = useMemo(() => {
    const bits = [title, price ? `${price}` : "", location || ""].filter(Boolean)
    return `${bits.join(" · ")} on CaterBidsUK`
  }, [location, price, title])

  function track(platform: SharePlatform) {
    try {
      void fetch("/api/social/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          platform,
          sharedUrl: shareUrl,
          metadata: { title, price, location },
        }),
      })
    } catch {
      // Sharing should still work if analytics is unavailable.
    }
  }

  async function copyLink() {
    track("copy")

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      try {
        const input = document.createElement("textarea")
        input.value = shareUrl
        input.setAttribute("readonly", "true")
        input.style.position = "fixed"
        input.style.left = "-9999px"
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        document.body.removeChild(input)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      } catch {
        window.prompt("Copy this listing link", shareUrl)
      }
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink()
      return
    }

    track("native")
    try {
      await navigator.share({ title, text: shareText, url: shareUrl })
    } catch {
      // User cancelled the native share sheet.
    }
  }

  const buttons = [
    {
      platform: "whatsapp" as const,
      label: "WhatsApp",
      icon: <span className="text-sm font-black">W</span>,
      href: `https://wa.me/?text=${encode(`${shareText} ${shareUrl}`)}`,
    },
    {
      platform: "facebook" as const,
      label: "Facebook",
      icon: <span className="text-sm font-black">f</span>,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encode(shareUrl)}`,
    },
    {
      platform: "x" as const,
      label: "X",
      icon: <span className="text-sm font-black">X</span>,
      href: `https://twitter.com/intent/tweet?text=${encode(shareText)}&url=${encode(shareUrl)}`,
    },
    {
      platform: "linkedin" as const,
      label: "LinkedIn",
      icon: <span className="text-sm font-black">in</span>,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encode(shareUrl)}`,
    },
    {
      platform: "email" as const,
      label: "Email",
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encode(title)}&body=${encode(`${shareText}\n\n${shareUrl}`)}`,
    },
  ]

  return (
    <div id="listing-share-panel" className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">{heading}</p>
          <p className="mt-1 text-sm font-bold text-white">{description}</p>
        </div>
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-3 py-2 text-xs font-black text-white sm:w-auto"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-6"}`}>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:border-[#FF6B00]/50"
        >
          {copied ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>

        {buttons.map((button) => (
          <a
            key={button.platform}
            href={button.href}
            onClick={() => track(button.platform)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:border-[#FF6B00]/50"
          >
            {button.icon}
            {button.label}
          </a>
        ))}
      </div>
    </div>
  )
}
