import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import type { ReactNode } from "react"
import { AlertTriangle, BadgeCheck, Building2, ShieldCheck, Star } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/app/admin/admin-utils"

export default async function AdminTrustPage() {
  await requireAdmin("/admin/trust")

  let flags: any[] = []
  let pendingVerifications: any[] = []
  let topSellers: any[] = []

  try {
    const admin = createAdminClient()
    const [flagResult, verificationResult, reviewResult] = await Promise.all([
      admin
        .from("trust_moderation_flags" as any)
        .select("*")
        .in("status", ["open", "reviewing"])
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("user_verifications" as any)
        .select("*")
        .or("id_verification_status.eq.pending,business_verification_status.eq.pending,business_verification_status.eq.companies_house_matched")
        .order("updated_at", { ascending: false })
        .limit(20),
      admin
        .from("seller_review_stats")
        .select("*")
        .gte("review_count", 1)
        .order("average_rating", { ascending: false })
        .limit(20),
    ])

    flags = flagResult.data || []
    pendingVerifications = verificationResult.data || []
    topSellers = reviewResult.data || []
  } catch (error) {
    console.warn("Trust admin data unavailable:", error)
  }

  const filters = [
    { label: "Pending verification", value: pendingVerifications.length, icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "Flagged users", value: flags.length, icon: <AlertTriangle className="h-5 w-5" /> },
    { label: "Top sellers", value: topSellers.length, icon: <Star className="h-5 w-5" /> },
    { label: "Business checks", value: pendingVerifications.filter((item) => item.business_verification_status !== "not_started").length, icon: <Building2 className="h-5 w-5" /> },
  ]

  return (
    <main className="app-bg min-h-screen px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center justify-between">
          <Link href="/account" className="soft-button rounded-2xl px-4 py-2 text-sm font-black">
            Account
          </Link>
          <SiteLogo size="sm" />
          <Link href="/" className="soft-button rounded-2xl px-4 py-2 text-sm font-black">
            Home
          </Link>
        </header>

        <section className="premium-shell rounded-[2rem] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">Admin</p>
          <h2 className="mt-1 text-3xl font-black">Trust dashboard</h2>
          <p className="mt-2 text-sm text-white/65">
            Review verifications, trust flags, disputes and seller quality signals.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {filters.map((filter) => (
            <div key={filter.label} className="premium-card rounded-3xl p-4">
              <div className="flex items-center justify-between text-[#FF6B00]">
                {filter.icon}
                <span className="text-2xl font-black">{filter.value}</span>
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-white/55">{filter.label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <TrustList
            title="Open trust flags"
            empty="No open flags."
            items={flags.map((flag) => ({
              id: flag.id,
              title: flag.flag_type,
              meta: `${flag.entity_type}${flag.entity_id ? ` • ${flag.entity_id}` : ""}`,
              note: flag.reason || "No note",
            }))}
          />
          <TrustList
            title="Pending checks"
            empty="No pending checks."
            items={pendingVerifications.map((item) => ({
              id: item.id,
              title: item.business_name || item.phone || item.user_id,
              meta: `ID: ${item.id_verification_status} • Business: ${item.business_verification_status}`,
              note: item.companies_house_number || "Awaiting verification",
            }))}
          />
        </section>

        <TrustList
          title="Top seller signals"
          empty="No review data yet."
          items={topSellers.map((seller) => ({
            id: seller.seller_id,
            title: `${Number(seller.average_rating || 0).toFixed(1)} star seller`,
            meta: `${seller.review_count} review${seller.review_count === 1 ? "" : "s"}`,
            note: seller.seller_id,
          }))}
          icon={<BadgeCheck className="h-5 w-5 text-[#FF6B00]" />}
        />
      </div>
    </main>
  )
}

function TrustList({
  title,
  empty,
  items,
  icon,
}: {
  title: string
  empty: string
  items: Array<{ id: string; title: string; meta: string; note: string }>
  icon?: ReactNode
}) {
  return (
    <section className="premium-card rounded-[2rem] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-black">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-black">{item.title}</p>
              <p className="mt-1 text-sm text-white/60">{item.meta}</p>
              <p className="mt-2 text-sm text-white/75">{item.note}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
