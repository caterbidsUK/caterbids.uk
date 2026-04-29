import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row'] & { email: string }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?redirect=/settings')
  }

  let profile: Profile | null = null

  const { data, error } = await supabase
    .from('profiles')
    .select('*, auth_users:users(email)')
    .eq('id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Profile fetch error:', error)
  }

  profile = data as Profile | null

  // Create profile if doesn't exist
  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: session.user.id,
      name: session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      verified: false
    })

    if (insertError) {
      console.error('Profile creation error:', insertError)
    } else {
      redirect('/settings')
    }
  }

  return <SettingsClient initialProfile={profile!} />
}
import {
  ArrowLeft,
  UserCircle,
  MapPin,
  Mail,
  Phone,
  Building2,
  Shield,
  Bell,
  LogOut,
  AlertTriangle,
  Settings,
  Save,
  ImagePlus,
  EyeOff,
  Check,
  LayoutGrid,
  Search,
  Plus,
  MessageCircle,
} from 'lucide-react'

interface Profile {
  name: string
  business: string
  location: string
  email: string
  phone: string
  avatar: string
}

interface Notifications {
  messages: boolean
  listings: boolean
  promotions: boolean
}

interface SettingsData {
  profile: Profile
  notifications: Notifications
}

const defaultProfile: Profile = {
  name: 'Colt Smith',
  business: 'CaterBids Demo Account',
  location: 'Birmingham, UK',
  email: 'demo@caterbids.uk',
  phone: '+44 121 123 4567',
  avatar: '',
}

const defaultNotifications: Notifications = {
  messages: true,
  listings: true,
  promotions: false,
}

"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { updateProfile, signOut } from './server-actions'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { Shield, EyeOff, Check, Bell } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row'] & { email: string }

export default function SettingsClient({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>(initialProfile || {
    id: '',
    name: '',
    business: '',
    location: '',
    phone: '',
    avatar_url: '',
    verified: false,
    created_at: null,
    updated_at: null,
    email: ''
  })
  const [editingProfile, setEditingProfile] = useState(false)
  const [draftProfile, setDraftProfile] = useState<Profile>(initialProfile || {
    id: '',
    name: '',
    business: '',
    location: '',
    phone: '',
    avatar_url: '',
    verified: false,
    created_at: null,
    updated_at: null,
    email: ''
  })
  const [notifications, setNotifications] = useState({
    messages: true,
    listings: true,
    promotions: false
  })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  
  const supabase = createClient()

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await updateProfile(formData)
        setMessage('Profile updated successfully!')
        setEditingProfile(false)
        router.refresh()
        setTimeout(() => setMessage(''), 3000)
      } catch (error: any) {
        setMessage(error.message || 'Update failed')
      }
    })
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed', error)
    }
  }
  
  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('caterbids_settings')
      if (saved) {
        const parsed: SettingsData = JSON.parse(saved)
        setSettings(parsed)
        setDraftProfile(parsed.profile)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const saveProfile = () => {
    const updatedSettings = { ...settings, profile: draftProfile }
    setSettings(updatedSettings)
    localStorage.setItem('caterbids_settings', JSON.stringify(updatedSettings))
    setEditingProfile(false)
  }

  const saveNotifications = (key: keyof Notifications, value: boolean) => {
    const updatedNotifications = { ...settings.notifications, [key]: value }
    const updatedSettings = { ...settings, notifications: updatedNotifications }
    setSettings(updatedSettings)
    localStorage.setItem('caterbids_settings', JSON.stringify(updatedSettings))
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDraftProfile({ ...draftProfile, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('caterbids_settings')
    router.push('/')
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      localStorage.clear()
      router.push('/')
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    // Simple toggle implementation - in real app use ref or state for each
    const input = document.getElementById(field + '-password') as HTMLInputElement
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password'
    }
  }

  return (
    <main className="min-h-screen bg-[#001633] text-white">
      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/account')}
            className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-white/80 hover:bg-white/10"
          >
            <ArrowLeft size={22} />
            <span className="hidden sm:inline font-semibold">Account</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-xs font-bold tracking-widest text-[#FF6B00]">
              BUY • SELL • SAVE
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <Settings size={22} />
          </div>
        </header>

        <h2 className="mb-2 text-3xl font-black md:text-4xl">Settings</h2>
        <p className="mb-8 text-lg text-white/60 md:text-xl">
          Manage your profile, security, notifications and account.
        </p>

        <div className="space-y-6">

          {/* SECTION 1: PROFILE */}
          <section className="rounded-3xl border border-white/10 bg-[#0d213d] p-6 shadow-xl md:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black">Profile</h3>
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="rounded-2xl bg-[#FF6B00]/20 px-4 py-2 text-[#FF6B00] hover:bg-[#FF6B00]/30"
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={saveProfile}
                  className="flex items-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-2 font-black text-white hover:bg-[#ff7d22]"
                >
                  <Save size={18} />
                  Save
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="mt-6 space-y-4">
                {/* Avatar Upload */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 file:mr-4 file:rounded-xl file:border-0 file:bg-[#FF6B00] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff7d22]"
                  />
{draftProfile.avatar && (
                    <img
                      src={draftProfile.avatar}
                      alt="Preview"
                      className="mt-3 h-24 w-24 rounded-2xl object-cover"
                    />
                  )}
                </div>

                {/* Form Fields */}
                <InputField
                  label="Name"
                  value={draftProfile.name}
                  onChange={(value) => setDraftProfile({ ...draftProfile, name: value })}
                />
                <InputField
                  label="Business Name"
                  value={draftProfile.business}
                  onChange={(value) => setDraftProfile({ ...draftProfile, business: value })}
                />
                <InputField
                  label="Location"
                  value={draftProfile.location}
                  onChange={(value) => setDraftProfile({ ...draftProfile, location: value })}
                />
                <InputField
                  label="Email"
                  value={draftProfile.email}
                  onChange={(value) => setDraftProfile({ ...draftProfile, email: value })}
                  type="email"
                />
                <InputField
                  label="Phone"
                  value={draftProfile.phone}
                  onChange={(value) => setDraftProfile({ ...draftProfile, phone: value })}
                />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <InfoRow icon={draftProfile.avatar ? undefined : <UserCircle size={20} />} label={settings.profile.name} />
                <InfoRow icon={<Building2 size={20} />} label={settings.profile.business} />
                <InfoRow icon={<MapPin size={20} />} label={settings.profile.location} />
                <InfoRow icon={<Mail size={20} />} label={settings.profile.email} />
                <InfoRow icon={<Phone size={20} />} label={settings.profile.phone} />
              </div>
            )}
          </section>

          {/* SECTION 2: SECURITY */}
          <section className="rounded-3xl border border-white/10 bg-[#0d213d] p-6 shadow-xl md:p-8">
            <h3 className="mb-6 text-2xl font-black">Security</h3>
            <div className="space-y-4">
              <InputField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                id="current-password"
              />
              <InputField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                id="new-password"
              />
              <InputField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                id="confirm-password"
              />
              <button
                onClick={() => {
                  console.log('Password change requested')
                  alert('Password change functionality coming soon!')
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="w-full rounded-2xl bg-[#FF6B00] py-4 font-black text-white hover:bg-[#ff7d22]"
              >
                Change Password
              </button>
            </div>
          </section>

          {/* SECTION 3: NOTIFICATIONS */}
          <section className="rounded-3xl border border-white/10 bg-[#0d213d] p-6 shadow-xl md:p-8">
            <h3 className="mb-6 text-2xl font-black">Notifications</h3>
            <div className="space-y-4">
              <ToggleItem
                label="Messages"
                description="New messages from buyers and sellers"
                checked={settings.notifications.messages}
                onChange={(checked) => saveNotifications('messages', checked)}
              />
              <ToggleItem
                label="New Listings Alerts"
                description="Matching your saved searches"
                checked={settings.notifications.listings}
                onChange={(checked) => saveNotifications('listings', checked)}
              />
              <ToggleItem
                label="Promotions"
                description="Special offers and featured deals"
                checked={settings.notifications.promotions}
                onChange={(checked) => saveNotifications('promotions', checked)}
              />
            </div>
          </section>

          {/* SECTION 4: ACCOUNT ACTIONS */}
          <section className="rounded-3xl border border-white/10 bg-[#0d213d] p-6 shadow-xl md:p-8">
            <h3 className="mb-6 text-2xl font-black">Account Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 py-4 font-bold text-white hover:bg-white/10"
              >
                <LogOut size={20} />
                Log Out
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/10 py-4 font-bold text-red-400 hover:bg-red-500/20"
              >
                <AlertTriangle size={20} />
                Delete Account
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#001326]/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-[430px] grid-cols-5 px-3 py-3 text-center">
          <NavButton icon={<LayoutGrid size={22} />} label="Home" onClick={() => router.push('/')} />
          <NavButton icon={<Search size={22} />} label="Search" onClick={() => router.push('/search')} />
          <NavButton icon={<Plus size={22} />} label="Sell" onClick={() => router.push('/post-listing')} special />
          <NavButton 
            icon={
              <>
                <MessageCircle size={22} />
                <span className="absolute -right-1 -top-1 rounded-full bg-[#FF6B00] px-1.5 text-[10px] font-black">12</span>
              </>
            } 
            label="Messages" 
            onClick={() => router.push('/messages')} 
          />
          <NavButton icon={<UserCircle size={22} />} label="Account" active onClick={() => router.push('/account')} />
        </div>
      </nav>
    </main>
  )
}

// Reusable Components (copied/adapted from account/page.tsx patterns)
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  id,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  id?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-12 text-white placeholder-white/40 focus:border-[#FF6B00] focus:outline-none"
        />
{type === 'password' && (
          <button
            type="button"
onClick={() => togglePasswordVisibility((id?.split('-')[0] as 'current' | 'new' | 'confirm') || 'current')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            <EyeOff size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

function ToggleItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4 hover:bg-white/10">
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-sm text-white/60">{description}</div>
      </div>
      <div
        className={`relative h-6 w-11 rounded-full transition-all duration-200 ${
          checked ? 'bg-[#FF6B00]' : 'bg-white/20'
        }`}
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
      >
        <div
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </div>
    </label>
  )
}

function InfoRow({
  icon,
  label,
}: {
  icon?: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10">
{icon && <div className="text-[#FF6B00] flex-shrink-0">{icon}</div>}
      <p className="truncate text-sm flex-1">{label}</p>
    </div>
  )
}

function NavButton({
  icon,
  label,
  active = false,
  onClick,
  special = false,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
  special?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${
        special ? '-mt-8' : ''
      } ${active ? 'text-[#FF6B00]' : 'text-white/60 hover:text-white'}`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

function togglePasswordVisibility(field: string) {
  const input = document.getElementById(field + '-password') as HTMLInputElement
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password'
  }
}

