import { ExternalLink } from "lucide-react"

export type SellerSocialLinksValue = Partial<Record<
  "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "website" | "whatsapp",
  string
>>

const LABELS: Record<keyof SellerSocialLinksValue, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  website: "Website",
  whatsapp: "WhatsApp",
}

function cleanUrl(key: keyof SellerSocialLinksValue, raw?: string) {
  const value = String(raw || "").trim()
  if (!value) return ""

  if (key === "whatsapp" && !/^https?:\/\//i.test(value)) {
    const digits = value.replace(/\D/g, "")
    if (!digits) return ""
    return `https://wa.me/${digits.startsWith("44") ? digits : `44${digits.replace(/^0/, "")}`}`
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export default function SellerSocialLinks({ links }: { links?: SellerSocialLinksValue | null }) {
  const visibleLinks = (Object.keys(LABELS) as Array<keyof SellerSocialLinksValue>)
    .map((key) => ({ key, href: cleanUrl(key, links?.[key]) }))
    .filter((item) => item.href)

  if (visibleLinks.length === 0) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Seller Links</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleLinks.map((item) => (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:border-[#FF6B00]/50"
          >
            {LABELS[item.key]}
            <ExternalLink className="h-3.5 w-3.5 text-[#FF6B00]" />
          </a>
        ))}
      </div>
    </div>
  )
}
