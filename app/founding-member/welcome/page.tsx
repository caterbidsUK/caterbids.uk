import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { Star, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import FoundingMemberBadge from "@/components/FoundingMemberBadge"
import WelcomePolling from "./WelcomePolling"

type SearchParams = Record<string, string | string[] | undefined>

const PERKS = [
  { title: "Up to 30 live listings", body: "List more equipment at once — no throttling, no queues." },
  { title: "1 free featured listing slot", body: "Pin any listing to the top of search and the homepage, forever free." },
  { title: "Founding Member badge", body: "Your profile and listings carry the badge that marks you as one of the first 100." },
  { title: "Enhanced seller profile", body: "Stand out with a richer storefront before it rolls out to everyone." },
  { title: "Early access to new features", body: "Be first in line for every new capability we ship." },
]

export default async function FoundingMemberWelcomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) || {}
  const fromCheckout = params.checkout === "success"

  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  let isFoundingMember = false
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_founding_member")
      .eq("id", user.id)
      .maybeSingle()
    isFoundingMember = Boolean((data as any)?.is_founding_member)
  }

  const showWelcome = fromCheckout || isFoundingMember

  return (
    <main className="min-h-screen bg-[#001633] px-4 py-16">
      <div className="mx-auto max-w-2xl">

        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <FoundingMemberBadge variant="full" />
        </div>

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-black text-white">
            {showWelcome ? "Welcome to the founding team" : "Founding Trade Member"}
          </h1>
          {showWelcome ? (
            <p className="text-base font-semibold text-white/60">
              You&apos;re officially one of the first 100 Founding Trade Members of CaterBidsUK.
            </p>
          ) : (
            <p className="text-base font-semibold text-white/60">
              Manage your Founding Trade Membership.
            </p>
          )}
        </div>

        {/* DB not yet reflected — soft notice */}
        {fromCheckout && !isFoundingMember && (
          <div className="mb-8 rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-5 py-4 text-center">
            <p className="text-sm font-bold text-[#FF6B00]">
              Your membership is activating — this usually takes a few seconds.
            </p>
            <p className="mt-1 text-xs text-white/50">This page will refresh automatically once it&apos;s confirmed.</p>
            <WelcomePolling isAlreadyActive={false} />
          </div>
        )}

        {isFoundingMember && <WelcomePolling isAlreadyActive={true} />}

        {/* Perks */}
        {showWelcome && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#001a3a] p-6">
            <p className="mb-5 text-xs font-black uppercase tracking-widest text-white/35">
              Your perks
            </p>
            <ul className="space-y-5">
              {PERKS.map((perk) => (
                <li key={perk.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6B00]" strokeWidth={2.5} />
                  <div>
                    <p className="font-black text-white">{perk.title}</p>
                    <p className="mt-0.5 text-sm text-white/55">{perk.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B00] px-8 py-4 text-base font-black text-white shadow-[0_8px_32px_rgba(255,107,0,0.35)] transition hover:bg-[#e85f00]"
          >
            <Star className="h-4 w-4 fill-white text-white" />
            Go to my account
          </Link>
          <Link
            href="/post-listing"
            className="text-sm font-bold text-white/45 transition hover:text-white/70"
          >
            Create a listing →
          </Link>
        </div>

      </div>
    </main>
  )
}
