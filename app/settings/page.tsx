"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { updateProfile } from './server-actions'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/supabase'
import Link from "next/link"
import {
  UserCircle,
  MapPin,
  Mail,
  Phone,
  Building2,
  LogOut,
  AlertTriangle,
  Save,
  EyeOff,
  LayoutGrid,
  Search,
  Plus,
  MessageCircle,
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row'] & { email: string }
const LOCAL_PROFILE_KEY = 'caterbids_profile'

function localProfileKey(userId: string) {
  return `${LOCAL_PROFILE_KEY}:${userId}`
}

function readLocalProfile(userId: string) {
  try {
    const savedLocalProfile =
      localStorage.getItem(localProfileKey(userId)) ||
      localStorage.getItem(LOCAL_PROFILE_KEY)
    const localProfile = savedLocalProfile ? JSON.parse(savedLocalProfile) as Partial<Profile> : null

    if (localProfile?.avatar_url?.startsWith('data:') && localProfile.avatar_url.length > 200000) {
      const cleanedProfile = {
        ...localProfile,
        avatar_url: '',
      }
      localStorage.setItem(localProfileKey(userId), JSON.stringify(cleanedProfile))
      return cleanedProfile
    }

    return localProfile
  } catch (error) {
    console.error('Failed to read saved profile:', error)
    localStorage.removeItem(LOCAL_PROFILE_KEY)
    return null
  }
}

function saveLocalProfile(profile: Profile) {
  try {
    const profileToSave = {
      ...profile,
      avatar_url: profile.avatar_url?.startsWith('data:') && profile.avatar_url.length > 200000
        ? ''
        : profile.avatar_url,
    }
    localStorage.setItem(localProfileKey(profile.id), JSON.stringify(profileToSave))
  } catch (error) {
    console.error('Failed to save local profile:', error)
  }
}

function resizeAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not load image'))
      image.onload = () => {
        const maxSize = 320
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Could not prepare image'))
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      image.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  return <SettingsClient initialProfile={null} />
}

function SettingsClient({ initialProfile }: { initialProfile: Profile | null }) {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  function openProfileEditor() {
    const localProfile = readLocalProfile(profile.id)
    setDraftProfile({
      ...profile,
      ...localProfile,
      email: profile.email,
    })
    setPreviewUrl("")
    setSelectedFile(null)
    setMessage("")
    setEditingProfile(true)
  }
  
  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)

      if (!user || !isMounted) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      const localProfile = readLocalProfile(user.id)

      const loadedProfile = {
        id: user.id,
        name: localProfile?.name || data?.name || user.email?.split('@')[0] || '',
        business: localProfile?.business || data?.business || '',
        location: localProfile?.location || data?.location || '',
        phone: localProfile?.phone || data?.phone || '',
        avatar_url: localProfile?.avatar_url || data?.avatar_url || '',
        verified: data?.verified || false,
        created_at: data?.created_at || null,
        updated_at: data?.updated_at || null,
        email: user.email || ''
      }

      setProfile(loadedProfile)
      setDraftProfile(loadedProfile)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        if (selectedFile) {
          formData.set("avatar", selectedFile)
        }
        if (previewUrl.startsWith('data:')) {
          formData.set("fallback_avatar_url", previewUrl)
        }

        const result = await updateProfile(formData)
        console.log("PROFILE UPDATED:", {
          success: result.success,
          storage: result.storage,
          hasAvatar: Boolean(result.profile.avatar_url),
        })

        const updatedProfile = {
          ...draftProfile,
          ...result.profile,
          email: draftProfile.email
        }

        saveLocalProfile(updatedProfile)
        setProfile(updatedProfile)
        setDraftProfile(updatedProfile)
        setSelectedFile(null)
        setPreviewUrl("")
        setMessage('Profile updated successfully!')
        setEditingProfile(false)
        router.refresh()
        setTimeout(() => setMessage(''), 3000)
      } catch (error: unknown) {
        console.error("PROFILE UPDATE FAILED:", error)
        setMessage(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  function handleProfileFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleSubmit(new FormData(event.currentTarget))
  }

  function handleProfileFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await fetch('/api/logout', { method: 'POST' })
      localStorage.removeItem('caterbids_settings')
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    try {
      setPreviewUrl(await resizeAvatar(file))
      setMessage('Profile image selected. Press Save to keep it.')
    } catch (error) {
      console.error('Avatar preview failed:', error)
      setPreviewUrl(URL.createObjectURL(file))
      setMessage('Profile image selected. Press Save to keep it.')
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      localStorage.clear()
      router.push('/')
    }
  }

  return (
    <main className="app-bg min-h-screen text-white">
      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/account"
            className="soft-button flex items-center gap-2 rounded-2xl px-4 py-2"
          >
            ← Account
          </Link>

          <Link href="/" className="text-center cursor-pointer">
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-xs font-bold tracking-widest text-[#FF6B00]">
              BUY • SELL • SAVE
            </p>
          </Link>

          <Link
            href="/"
            className="soft-button flex items-center gap-2 rounded-2xl px-4 py-2"
          >
            Home
          </Link>
        </header>

        <h2 className="mb-2 text-3xl font-black md:text-4xl">Settings</h2>
        <p className="mb-8 text-lg text-white/60 md:text-xl">
          Manage your profile, security, notifications and account.
        </p>
        {message && (
          <p className="premium-card mb-6 rounded-2xl px-4 py-3 text-sm font-bold text-white/80">
            {message}
          </p>
        )}

        <div className="space-y-6">

          {/* SECTION 1: PROFILE */}
          <section className="premium-card rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black">Profile</h3>
              <button
                type="button"
                onClick={openProfileEditor}
                disabled={editingProfile}
                className="soft-button rounded-2xl px-4 py-2 text-[#FF6B00] disabled:cursor-default disabled:opacity-50"
              >
                {editingProfile ? 'Editing' : 'Edit'}
              </button>
            </div>

            {editingProfile ? (
              <form
                id="profile-form"
                onSubmit={handleProfileFormSubmit}
                onKeyDown={handleProfileFormKeyDown}
                className="mt-6 space-y-4"
              >
                {/* Avatar Upload */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Profile Photo</label>
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="premium-input w-full rounded-2xl px-4 py-4 file:mr-4 file:rounded-xl file:border-0 file:bg-[#FF6B00] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff7d22]"
                  />
                  <input type="hidden" name="existing_avatar_url" value={draftProfile.avatar_url || ""} />
                  <input type="hidden" name="fallback_avatar_url" value={previewUrl.startsWith('data:') ? previewUrl : ""} />
{(previewUrl || draftProfile.avatar_url) && (
                    <img
                      src={previewUrl || draftProfile.avatar_url || ""}
                      alt="Preview"
                      className="mt-3 h-24 w-24 rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/20"
                    />
                  )}
                </div>

                {/* Form Fields */}
                <InputField
                  label="Name"
                  name="name"
                  value={draftProfile.name}
                  onChange={(value) => setDraftProfile({ ...draftProfile, name: value })}
                />
                <InputField
                  label="Business Name"
                  name="business"
                  value={draftProfile.business}
                  onChange={(value) => setDraftProfile({ ...draftProfile, business: value })}
                />
                <InputField
                  label="Location"
                  name="location"
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
                  name="phone"
                  value={draftProfile.phone}
                  onChange={(value) => setDraftProfile({ ...draftProfile, phone: value })}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="premium-button flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-white/75 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    {draftProfile.avatar_url ? (
                      <img
                        src={draftProfile.avatar_url}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-12 w-12 text-white/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">Profile Photo</p>
                    <p className="mt-1 text-sm text-white/50">
                      Click Edit to update your image and profile details.
                    </p>
                  </div>
                </div>
                <InfoRow icon={draftProfile.avatar_url ? undefined : <UserCircle size={20} />} label={draftProfile.name} />
                <InfoRow icon={<Building2 size={20} />} label={draftProfile.business} />
                <InfoRow icon={<MapPin size={20} />} label={draftProfile.location} />
                <InfoRow icon={<Mail size={20} />} label={draftProfile.email} />
                <InfoRow icon={<Phone size={20} />} label={draftProfile.phone} />
              </div>
            )}
          </section>

          {/* SECTION 2: SECURITY */}
          <section className="premium-card rounded-[2rem] p-6 md:p-8">
            <h3 className="mb-6 text-2xl font-black">Security</h3>
            <div className="space-y-4">
              <InputField
                label="Current Password"
                type="password"
                value=""
                onChange={() => {}}
                id="current-password"
              />
              <InputField
                label="New Password"
                type="password"
                value=""
                onChange={() => {}}
                id="new-password"
              />
              <InputField
                label="Confirm New Password"
                type="password"
                value=""
                onChange={() => {}}
                id="confirm-password"
              />
              <button
                onClick={() => {
                  console.log('Password change requested')
                  alert('Password change functionality coming soon!')
                }}
                className="premium-button w-full rounded-2xl py-4 font-black text-white"
              >
                Change Password
              </button>
            </div>
          </section>

          {/* SECTION 3: NOTIFICATIONS */}
          <section className="premium-card rounded-[2rem] p-6 md:p-8">
            <h3 className="mb-6 text-2xl font-black">Notifications</h3>
            <div className="space-y-4">
              <ToggleItem
                label="Messages"
                description="New messages from buyers and sellers"
                checked={notifications.messages}
                onChange={(checked) => setNotifications({ ...notifications, messages: checked })}
              />
              <ToggleItem
                label="New Listings Alerts"
                description="Matching your saved searches"
                checked={notifications.listings}
                onChange={(checked) => setNotifications({ ...notifications, listings: checked })}
              />
              <ToggleItem
                label="Promotions"
                description="Special offers and featured deals"
                checked={notifications.promotions}
                onChange={(checked) => setNotifications({ ...notifications, promotions: checked })}
              />
            </div>
          </section>

          {/* SECTION 4: ACCOUNT ACTIONS */}
          <section className="premium-card rounded-[2rem] p-6 md:p-8">
            <h3 className="mb-6 text-2xl font-black">Account Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="soft-button flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-bold"
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
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 lg:hidden">
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
  name,
  value,
  onChange,
  type = 'text',
  id,
}: {
  label: string
  name?: string
  value: string | null
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
          name={name}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="premium-input w-full rounded-2xl px-4 py-4 pr-12 text-white placeholder-white/40"
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
    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/10">
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
  label: string | null
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10">
{icon && <div className="text-[#FF6B00] flex-shrink-0">{icon}</div>}
      <p className="truncate text-sm flex-1">{label || ''}</p>
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
      className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1 ${
        special ? '-mt-8' : ''
      } ${active ? 'bg-[#FF6B00]/12 text-[#FF6B00]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
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
