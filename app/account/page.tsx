import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  const cookieStore = await cookies()
  const hasDevAuth =
    process.env.NODE_ENV === 'development' && cookieStore.get('caterbids_dev_auth')?.value === '1'

  if (!user && !hasDevAuth) {
    redirect('/login')
  }

  if (!user && hasDevAuth) {
    return (
      <AccountClient
        profile={{
          id: 'local-beta-preview',
          name: 'Local Beta Preview',
          business: 'CaterBidsUK',
          location: 'UK',
          phone: '',
          seller_contact_name: '',
          collection_full_address: '',
          collection_city: '',
          collection_postcode: '',
          avatar_url: '',
          verified: false,
          created_at: null,
          updated_at: null,
        }}
        userEmail="local-beta@caterbids.uk"
        createdAt={null}
        userId="local-beta-preview"
        stats={[
          { label: 'Active Listings', value: 0 },
          { label: 'Messages', value: 0 },
          { label: 'Saved Items', value: 0 },
          { label: 'Search Alerts', value: 0 },
        ]}
      />
    )
  }

  if (!user) {
    redirect('/login')
  }

  const authedUser = user

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authedUser.id)
    .maybeSingle()

  const profile = profileData || {
    id: authedUser.id,
    name: authedUser.email?.split('@')[0] || 'User',
    business: '',
    location: '',
    phone: '',
    seller_contact_name: '',
    collection_full_address: '',
    collection_city: '',
    collection_postcode: '',
    avatar_url: '',
    verified: false,
    created_at: null,
    updated_at: null
  }

  // Fetch real stats
  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authedUser.id)
    .or('status.is.null,status.eq.live,status.eq.payment_pending')

  const { count: favouritesCount } = await supabase
    .from('favourites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authedUser.id)

  const messagesCount = 0
  const alertsCount = 0

  const stats = [
    { label: 'Active Listings', value: listingsCount || 0 },
    { label: 'Messages', value: messagesCount },
    { label: 'Saved Items', value: favouritesCount || 0 },
    { label: 'Search Alerts', value: alertsCount },
  ]

  return (
    <AccountClient 
      profile={profile}
      userEmail={authedUser.email || ''}
      createdAt={profile.created_at || null}
      userId={authedUser.id}
      stats={stats}
    />
  )
}
