import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import EditListingForm from './EditListingForm'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) redirect(`/login?redirect=/account/listings/${id}/edit`)

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .in('status', ['live', 'draft', 'pending', 'paused', 'hidden'])
    .maybeSingle()

  // Never reveal that a listing exists, is owned by someone else, or is in an
  // uneditable state (sold, pending_payment, deleted) — same redirect for all.
  const isOwner = listing && (listing.seller_id === user.id || listing.user_id === user.id)
  if (!listing || !isOwner) redirect('/account')

  return <EditListingForm listing={listing} />
}
