import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSellerCredits } from '@/lib/entitlements/usage'
import { TRADE_PLAN_NAME } from '@/lib/pricing'
import { priceKey } from '@/lib/price'
import BulkUploadClient from './BulkUploadClient'

export const metadata = { title: 'Bulk Upload — CaterBidsUK' }

export default async function BulkUploadPage() {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) redirect('/login?next=/account/bulk-upload')

  const admin = createAdminClient()
  const credits = await getSellerCredits(admin, user.id)

  const isAllowed =
    credits.planType === 'founding' ||
    (credits.planType === 'subscription' && credits.planName === TRADE_PLAN_NAME)

  // Load the seller's existing listing keys so the client-side preview can flag
  // duplicates before the seller presses Create — not after.
  let existingKeys: string[] = []
  if (isAllowed) {
    const { data: existingListings } = await supabase
      .from('listings')
      .select('title, price, location, category')
      .eq('user_id', user.id)
      .not('status', 'eq', 'deleted')

    existingKeys = (existingListings || []).map((l) =>
      [
        (l.title ?? '').toLowerCase(),
        priceKey(l.price),
        (l.location ?? '').toLowerCase(),
        (l.category ?? '').toLowerCase(),
      ].join('|')
    )
  }

  return (
    <main className="min-h-screen bg-[#001633] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Bulk Upload</h1>
          <p className="mt-1 text-sm text-white/50">
            Create up to 100 draft listings at once from a spreadsheet paste.
          </p>
        </div>

        {isAllowed ? (
          <BulkUploadClient existingKeys={existingKeys} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#001a3a] p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Lock className="h-5 w-5 text-white/40" />
              </div>
            </div>
            <p className="text-base font-black text-white">
              Bulk upload is available on Trade.
            </p>
            <p className="mt-2 text-sm text-white/55">
              Upgrade to list up to 100 items at once.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#FF6B00] px-6 py-3 text-sm font-black text-white shadow-[0_8px_32px_rgba(255,107,0,0.25)] transition hover:bg-[#e85f00]"
            >
              See Trade Plan
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
