"use client"

import { Check, Copy, Mail } from "lucide-react"
import { useMemo, useState } from "react"

type SharePlatform = "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "copy"

type SocialShareButtonsProps = {
  listingId?: string
  title: string
  price?: string | number | null
  location?: string | null
  url?: string
  compact?: boolean
  heading?: string
  description?: string
  inline?: boolean
}

function encode(value: string) {
  return encodeURIComponent(value)
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  if (typeof window === "undefined") return value
  return new URL(value, window.location.origin).toString()
}

function IconWhatsApp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.52 13.84c-.21.59-1.26 1.13-1.72 1.19-.44.06-1.02.08-1.65-.1-.38-.11-.87-.26-1.5-.51-2.63-1.14-4.35-3.78-4.48-3.95-.13-.17-1.01-1.35-1.01-2.57 0-1.22.64-1.83.87-2.08.22-.25.49-.31.66-.31h.48c.15 0 .35-.06.55.42l.77 1.91c.06.16.1.34.01.51l-.31.45-.38.46c-.13.14-.27.29-.12.57.15.28.67 1.11 1.44 1.8.99.88 1.82 1.15 2.08 1.28.25.13.4.11.55-.07l.63-.75c.18-.21.35-.14.59-.05l1.91.9c.24.11.4.17.45.26.06.09.06.53-.15 1.09z" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

type PillProps = {
  icon: React.ReactNode
  label: string
  brandColor: string
  onClick?: () => void | Promise<void>
  href?: string
  external?: boolean
}

function Pill({ icon, label, brandColor, onClick, href, external = true }: PillProps) {
  const [hovered, setHovered] = useState(false)

  const style: React.CSSProperties = {
    borderColor: hovered ? `${brandColor}90` : "rgba(255,255,255,0.08)",
    boxShadow: hovered ? `0 0 10px ${brandColor}26` : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  }

  const className =
    "flex flex-col items-center gap-1.5 rounded-xl border bg-[#12294A] w-[76px] py-2.5 px-1 select-none"

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  const inner = (
    <>
      <span className="flex items-center justify-center" style={{ color: brandColor }}>
        {icon}
      </span>
      <span className="text-[11px] font-semibold leading-none" style={{ color: "#C7D4E6" }}>
        {label}
      </span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={className}
        style={style}
        {...handlers}
      >
        {inner}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style} {...handlers}>
      {inner}
    </button>
  )
}

export default function SocialShareButtons({
  listingId,
  title,
  price,
  location,
  url,
  compact: _compact,
  heading,
  description,
  inline = false,
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (url) return absoluteUrl(url)
    if (typeof window !== "undefined") return absoluteUrl(window.location.href)
    return listingId ? `/listing?id=${listingId}` : "/"
  }, [listingId, url])

  const shareText = useMemo(() => {
    const bits = [title, price ? `${price}` : "", location || ""].filter(Boolean)
    return `${bits.join(" · ")} on CaterBidsUK`
  }, [location, price, title])

  function track(platform: SharePlatform) {
    if (!listingId) return
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
        window.prompt("Copy this link", shareUrl)
      }
    }
  }

  const pills = (
    <div className="flex flex-wrap gap-2">
      <Pill
        icon={copied ? <Check size={22} /> : <Copy size={22} />}
        label={copied ? "Copied!" : "Copy link"}
        brandColor="#FF6B00"
        onClick={copyLink}
      />
      <Pill
        icon={<IconWhatsApp />}
        label="WhatsApp"
        brandColor="#25D366"
        href={`https://wa.me/?text=${encode(`${shareText} ${shareUrl}`)}`}
        onClick={() => track("whatsapp")}
      />
      <Pill
        icon={<IconFacebook />}
        label="Facebook"
        brandColor="#1877F2"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encode(shareUrl)}`}
        onClick={() => track("facebook")}
      />
      <Pill
        icon={<IconX />}
        label="X"
        brandColor="#FFFFFF"
        href={`https://twitter.com/intent/tweet?text=${encode(shareText)}&url=${encode(shareUrl)}`}
        onClick={() => track("x")}
      />
      <Pill
        icon={<IconLinkedIn />}
        label="LinkedIn"
        brandColor="#0A66C2"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encode(shareUrl)}`}
        onClick={() => track("linkedin")}
      />
      <Pill
        icon={<Mail size={22} />}
        label="Email"
        brandColor="#FF6B00"
        href={`mailto:?subject=${encode(title)}&body=${encode(`${shareText}\n\n${shareUrl}`)}`}
        external={false}
        onClick={() => track("email")}
      />
    </div>
  )

  if (inline) return pills

  return (
    <div id="listing-share-panel" className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      {heading && (
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">{heading}</p>
          {description && <p className="mt-1 text-sm font-bold text-white">{description}</p>}
        </div>
      )}
      {pills}
    </div>
  )
}
