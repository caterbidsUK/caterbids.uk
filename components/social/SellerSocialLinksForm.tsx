"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { SellerSocialLinksValue } from "./SellerSocialLinks"
import type { Database } from "@/types/supabase"

type ProfileUpdateWithSocialLinks = Database["public"]["Tables"]["profiles"]["Update"] & {
  social_links?: SellerSocialLinksValue
}

const FIELDS: Array<{ key: keyof SellerSocialLinksValue; label: string; placeholder: string }> = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
  { key: "website", label: "Website", placeholder: "https://yourbusiness.co.uk" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+447000000000" },
]

export default function SellerSocialLinksForm({ initialLinks }: { initialLinks?: SellerSocialLinksValue | null }) {
  const [links, setLinks] = useState<SellerSocialLinksValue>(initialLinks || {})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function saveLinks() {
    setSaving(true)
    setMessage("")

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage("Sign in to save social links.")
        return
      }

      const cleaned = Object.fromEntries(
        Object.entries(links).map(([key, value]) => [key, String(value || "").trim()]).filter(([, value]) => value)
      )

      const updatePayload: ProfileUpdateWithSocialLinks = { social_links: cleaned }
      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id)
      if (error) throw error
      setLinks(cleaned as SellerSocialLinksValue)
      setMessage("Social links saved.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save social links.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Social Links</p>
      <h2 className="mt-2 text-xl font-black text-white">Seller social links</h2>
      <p className="mt-1 text-sm text-white/65">Add public links buyers can use to learn more about your business.</p>

      <div className="mt-4 grid gap-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-white/55">{field.label}</span>
            <input
              value={links[field.key] || ""}
              onChange={(event) => setLinks((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-[#002E5D] outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
        ))}
      </div>

      {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white">{message}</p>}

      <button
        type="button"
        onClick={saveLinks}
        disabled={saving}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save social links"}
      </button>
    </section>
  )
}
