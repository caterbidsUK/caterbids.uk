import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const profile = profileData || {
    name: session.user.email?.split('@')[0] || 'User',
    business: '',
    location: '',
    phone: '',
    avatar_url: '',
    verified: false
  }

  const stats = [
    { label: 'Active Listings', value: '3' },
    { label: 'Messages', value: '12' },
    { label: 'Saved Items', value: '8' },
    { label: 'Search Alerts', value: '4' },
  ]

  return <div className="p-8 text-center">
    <h1 className="text-4xl font-black mb-4">Account</h1>
    <p className="text-xl text-white/70 mb-8 max-w-md mx-auto">
      Now powered by Supabase! Profile data: 
      <pre className="mt-4 p-4 bg-[#0d213d] rounded-2xl text-left text-sm">{JSON.stringify(profile, null, 2)}</pre>
    </p>
    <a href="/settings" className="bg-[#FF6B00] px-8 py-4 rounded-2xl font-black text-white hover:bg-[#ff7d22]">
      → Edit Profile in Settings
    </a>
  </div>
}
