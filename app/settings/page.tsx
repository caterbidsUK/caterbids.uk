"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { updateProfile } from './server-actions'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import SellerSocialLinksForm from '@/components/social/SellerSocialLinksForm'
import type { SellerSocialLinksValue } from '@/components/social/SellerSocialLinks'
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
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  email: string
  social_links?: SellerSocialLinksValue | null
}

type PhoneVerificationResponse = {
  ok?: boolean
  error?: string
  phone?: string
  message?: string
  emailVerified?: boolean
  badge?: string
  verificationLevel?: string
}

type IdentityVerificationResponse = {
  error?: string
  url?: string
}

type BusinessVerificationResponse = {
  error?: string
  businessName?: string
  businessVerified?: boolean
  needsStripeConnect?: boolean
}

const LOCAL_PROFILE_KEY = 'caterbids_profile'
const SOCIAL_LINK_KEYS: Array<keyof SellerSocialLinksValue> = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'youtube',
  'website',
  'whatsapp',
]

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

function normaliseSocialLinks(value: unknown): SellerSocialLinksValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return SOCIAL_LINK_KEYS.reduce<SellerSocialLinksValue>((links, key) => {
    const rawValue = (value as Record<string, unknown>)[key]
    if (typeof rawValue === 'string' && rawValue.trim()) {
      links[key] = rawValue.trim()
    }
    return links
  }, {})
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
    email: '',
    name: '',
    full_name: '',
    business: '',
    business_name: '',
    account_type: 'buyer',
    location: '',
    phone: '',
    phone_number: '',
    seller_contact_name: '',
    collection_full_address: '',
    collection_city: '',
    collection_postcode: '',
    avatar_url: '',
    verified: false,
    email_verified: false,
    is_email_verified: false,
    verification_level: 'basic',
    badge: 'Email pending',
    verified_user_badge: false,
    auth_provider: null,
    auth_providers: [],
    last_login_at: null,
    phone_verified: false,
    is_phone_verified: false,
    phone_verified_at: null,
    phone_verification_method: 'manual',
    phone_verification_status: 'pending',
    phone_verification_code: null,
    phone_verification_expires_at: null,
    phone_verification_attempts: 0,
    role: 'user',
    verified_dealer: false,
    stripe_connect_onboarding_complete: false,
    stripe_identity_session_id: null,
    stripe_identity_status: null,
    government_id_verified: false,
    business_verified: false,
    is_founding_member: false,
    is_test: false,
    companies_house_number: null,
    vat_number: null,
    trust_notes: null,
    seller_verification_level: 'unverified',
    created_at: null,
    updated_at: null,
    deletion_scheduled_at: null,
    social_links: null,
  })
  const [editingProfile, setEditingProfile] = useState(false)
  const [draftProfile, setDraftProfile] = useState<Profile>(initialProfile || {
    id: '',
    email: '',
    name: '',
    full_name: '',
    business: '',
    business_name: '',
    account_type: 'buyer',
    location: '',
    phone: '',
    phone_number: '',
    seller_contact_name: '',
    collection_full_address: '',
    collection_city: '',
    collection_postcode: '',
    avatar_url: '',
    verified: false,
    email_verified: false,
    is_email_verified: false,
    verification_level: 'basic',
    badge: 'Email pending',
    verified_user_badge: false,
    auth_provider: null,
    auth_providers: [],
    last_login_at: null,
    phone_verified: false,
    is_phone_verified: false,
    phone_verified_at: null,
    phone_verification_method: 'manual',
    phone_verification_status: 'pending',
    phone_verification_code: null,
    phone_verification_expires_at: null,
    phone_verification_attempts: 0,
    role: 'user',
    verified_dealer: false,
    stripe_connect_onboarding_complete: false,
    stripe_identity_session_id: null,
    stripe_identity_status: null,
    government_id_verified: false,
    business_verified: false,
    is_founding_member: false,
    is_test: false,
    companies_house_number: null,
    vat_number: null,
    trust_notes: null,
    seller_verification_level: 'unverified',
    created_at: null,
    updated_at: null,
    deletion_scheduled_at: null,
    social_links: null,
  })
  const [notifications, setNotifications] = useState({
    messages: true,
    listings: true,
    promotions: false
  })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [verificationPhone, setVerificationPhone] = useState('')
  const [companiesHouseNumber, setCompaniesHouseNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [verificationConsent, setVerificationConsent] = useState(false)
  const [trustActionPending, setTrustActionPending] = useState(false)
  const [businessVerifyResult, setBusinessVerifyResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

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
      const dbProfile = data as Profile | null
      const localProfile = readLocalProfile(user.id)

      const loadedProfile = {
        id: user.id,
        email: dbProfile?.email || user.email || '',
        name: localProfile?.name || dbProfile?.name || user.email?.split('@')[0] || '',
        full_name: dbProfile?.full_name || localProfile?.name || dbProfile?.name || user.email?.split('@')[0] || '',
        business: localProfile?.business || dbProfile?.business || '',
        business_name: dbProfile?.business_name || localProfile?.business || dbProfile?.business || '',
        account_type: dbProfile?.account_type || (dbProfile?.role === 'seller' || dbProfile?.role === 'dealer' ? 'seller' : 'buyer'),
        location: localProfile?.location || dbProfile?.location || '',
        phone: localProfile?.phone || dbProfile?.phone || '',
        phone_number: dbProfile?.phone_number || localProfile?.phone || dbProfile?.phone || '',
        seller_contact_name: localProfile?.seller_contact_name || dbProfile?.seller_contact_name || '',
        collection_full_address: localProfile?.collection_full_address || dbProfile?.collection_full_address || '',
        collection_city: localProfile?.collection_city || dbProfile?.collection_city || dbProfile?.location || '',
        collection_postcode: localProfile?.collection_postcode || dbProfile?.collection_postcode || '',
        avatar_url: localProfile?.avatar_url || dbProfile?.avatar_url || '',
        verified: dbProfile?.verified || false,
        email_verified: dbProfile?.email_verified || dbProfile?.verified || false,
        is_email_verified: dbProfile?.is_email_verified || dbProfile?.email_verified || dbProfile?.verified || false,
        verification_level: dbProfile?.verification_level || 'basic',
        badge: dbProfile?.badge || (dbProfile?.verified ? 'Verified User' : 'Email pending'),
        verified_user_badge: dbProfile?.verified_user_badge || false,
        auth_provider: dbProfile?.auth_provider || null,
        auth_providers: dbProfile?.auth_providers || [],
        last_login_at: dbProfile?.last_login_at || null,
        phone_verified: dbProfile?.phone_verified || false,
        is_phone_verified: dbProfile?.is_phone_verified || dbProfile?.phone_verified || false,
        phone_verified_at: dbProfile?.phone_verified_at || null,
        phone_verification_method: dbProfile?.phone_verification_method || 'manual',
        phone_verification_status: dbProfile?.phone_verification_status || (dbProfile?.phone_verified ? 'verified' : 'pending'),
        phone_verification_code: null,
        phone_verification_expires_at: null,
        phone_verification_attempts: dbProfile?.phone_verification_attempts || 0,
        role: dbProfile?.role || 'user',
        verified_dealer: dbProfile?.verified_dealer || false,
        stripe_connect_onboarding_complete: dbProfile?.stripe_connect_onboarding_complete || false,
        stripe_identity_session_id: dbProfile?.stripe_identity_session_id || null,
        stripe_identity_status: dbProfile?.stripe_identity_status || null,
        government_id_verified: dbProfile?.government_id_verified || false,
        business_verified: dbProfile?.business_verified || false,
        is_founding_member: dbProfile?.is_founding_member || false,
        is_test: dbProfile?.is_test || false,
        companies_house_number: dbProfile?.companies_house_number || null,
        vat_number: dbProfile?.vat_number || null,
        trust_notes: dbProfile?.trust_notes || null,
        seller_verification_level: dbProfile?.seller_verification_level || 'unverified',
        created_at: dbProfile?.created_at || null,
        updated_at: dbProfile?.updated_at || null,
        deletion_scheduled_at: dbProfile?.deletion_scheduled_at ?? null,
        social_links: normaliseSocialLinks(dbProfile?.social_links),
      } satisfies Profile

      setProfile(loadedProfile)
      setDraftProfile(loadedProfile)
      setVerificationPhone(loadedProfile.phone_number || loadedProfile.phone || '')
      setCompaniesHouseNumber(dbProfile?.companies_house_number || '')
      setVatNumber(dbProfile?.vat_number || '')
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

  async function savePhoneNumberForManualReview() {
    const phoneToVerify = verificationPhone || profile.phone || profile.phone_number
    if (!phoneToVerify) {
      setMessage('Enter a valid UK mobile number.')
      return
    }

    setTrustActionPending(true)
    try {
      const response = await fetch('/api/account/save-phone-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToVerify }),
      })
      const result = await response.json().catch(() => ({})) as PhoneVerificationResponse
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save mobile number.')
      if (result.phone) {
        setVerificationPhone(result.phone)
        setProfile({
          ...profile,
          phone: result.phone,
          phone_number: result.phone,
          phone_verified: false,
          is_phone_verified: false,
          phone_verified_at: null,
          phone_verification_method: 'manual',
          phone_verification_status: 'pending',
        })
        setDraftProfile({
          ...draftProfile,
          phone: result.phone,
          phone_number: result.phone,
          phone_verified: false,
          is_phone_verified: false,
          phone_verified_at: null,
          phone_verification_method: 'manual',
          phone_verification_status: 'pending',
        })
      }
      setMessage(result.message || 'Phone verification is reviewed manually during launch.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save mobile number.')
    } finally {
      setTrustActionPending(false)
    }
  }

  async function startIdentityVerification() {
    setTrustActionPending(true)
    try {
      const response = await fetch('/api/trust/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/account' }),
      })
      const result = await response.json().catch(() => ({})) as IdentityVerificationResponse
      if (!response.ok) throw new Error(result.error || 'Could not start ID verification.')
      if (result.url) {
        window.location.href = result.url
        return
      }
      setMessage('ID verification started.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start ID verification.')
    } finally {
      setTrustActionPending(false)
    }
  }

  async function verifyBusiness() {
    if (!companiesHouseNumber || !verificationConsent) {
      setBusinessVerifyResult({ ok: false, text: 'Enter your Companies House number and tick the consent box.' })
      return
    }

    setTrustActionPending(true)
    setBusinessVerifyResult(null)
    try {
      const response = await fetch('/api/trust/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companiesHouseNumber,
          vatNumber,
          consentAccepted: verificationConsent,
        }),
      })
      const result = await response.json().catch(() => ({})) as BusinessVerificationResponse
      if (!response.ok) throw new Error(result.error || 'Could not verify business.')
      setProfile({
        ...profile,
        business: result.businessName || profile.business,
        business_verified: Boolean(result.businessVerified),
        seller_verification_level: result.businessVerified ? 'business_verified' : 'business_pending',
      })
      const successText = result.businessVerified
        ? `Verified: ${result.businessName}`
        : result.needsStripeConnect
          ? `${result.businessName} matched. Connect Stripe payouts to complete business verification.`
          : `${result.businessName} matched. Verification is pending.`
      setBusinessVerifyResult({ ok: true, text: successText })
    } catch (error) {
      setBusinessVerifyResult({ ok: false, text: error instanceof Error ? error.message : 'Could not verify business.' })
    } finally {
      setTrustActionPending(false)
    }
  }

  const isSocialLogin = Boolean(profile.auth_provider && profile.auth_provider !== 'email')

  async function submitDeleteAccount() {
    setDeleteError('')
    if (deleteTypeConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.')
      return
    }
    setDeleteSubmitting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSocialLogin
            ? { confirmEmail: deleteConfirmEmail }
            : { password: deletePassword }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete account. Please try again.')
        setDeleteSubmitting(false)
        return
      }
      localStorage.clear()
      router.push('/')
    } catch {
      setDeleteError('Network error. Please try again.')
      setDeleteSubmitting(false)
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
          <section id="profile" className="premium-card scroll-mt-24 rounded-[2rem] p-6 md:p-8">
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

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h4 className="text-lg font-black text-white">Seller collection details</h4>
                  <p className="mt-1 text-sm text-white/55">
                    Used to auto-fill delivery details when you list an item.
                  </p>

                  <div className="mt-4 space-y-4">
                    <InputField
                      label="Collection contact name"
                      name="seller_contact_name"
                      value={draftProfile.seller_contact_name || draftProfile.name}
                      onChange={(value) => setDraftProfile({ ...draftProfile, seller_contact_name: value })}
                    />
                    <InputField
                      label="Collection full address"
                      name="collection_full_address"
                      value={draftProfile.collection_full_address}
                      onChange={(value) => setDraftProfile({ ...draftProfile, collection_full_address: value })}
                    />
                    <InputField
                      label="Collection city"
                      name="collection_city"
                      value={draftProfile.collection_city || draftProfile.location}
                      onChange={(value) => setDraftProfile({ ...draftProfile, collection_city: value })}
                    />
                    <InputField
                      label="Collection postcode"
                      name="collection_postcode"
                      value={draftProfile.collection_postcode}
                      onChange={(value) => setDraftProfile({ ...draftProfile, collection_postcode: value.toUpperCase() })}
                    />
                  </div>
                </div>
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
                <InfoRow icon={<MapPin size={20} />} label={draftProfile.collection_full_address || 'Collection address not added'} />
                <InfoRow icon={<MapPin size={20} />} label={[draftProfile.collection_city, draftProfile.collection_postcode].filter(Boolean).join(' ') || 'Collection postcode not added'} />
              </div>
            )}
          </section>

          <SellerSocialLinksForm initialLinks={profile.social_links || null} />

          {/* SECTION 2: TRUST */}
          <section id="verification" className="premium-card scroll-mt-24 rounded-[2rem] p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#FF6B00]/15 p-3 text-[#FF9A4A]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Trust & verification</h3>
                <p className="mt-1 text-sm text-white/60">
                  Fast checks that help buyers trust your CaterBidsUK account.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <TrustStatus
                icon={<BadgeCheck className="h-5 w-5" />}
                title="Verified User"
                active={Boolean(profile.email_verified && profile.phone_verified)}
                text={profile.email_verified ? (profile.phone_verified ? 'Email + phone checked' : 'Phone pending verification') : 'Email pending'}
              />
              <TrustStatus
                icon={<ShieldCheck className="h-5 w-5" />}
                title="ID Verified"
                active={Boolean(profile.government_id_verified)}
                text="Required before payouts"
              />
              <TrustStatus
                icon={<Building2 className="h-5 w-5" />}
                title="Verified Business"
                active={Boolean(profile.business_verified)}
                text="Companies House + payouts"
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-black">Mobile verification</h4>
                <p className="mt-1 text-sm text-white/60">
                  Phone verification is reviewed manually during launch.
                </p>
                <div className="mt-4 grid gap-3">
                  <InputField
                    label="Mobile number"
                    value={verificationPhone}
                    onChange={setVerificationPhone}
                    type="tel"
                    id="verification-phone"
                  />
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                    {profile.phone_verified ? 'Phone verified.' : 'Status: Phone pending admin verification.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={savePhoneNumberForManualReview}
                      disabled={trustActionPending || Boolean(profile.phone_verified)}
                      className="soft-button rounded-2xl px-4 py-4 text-sm font-black disabled:opacity-50"
                    >
                      {trustActionPending ? 'Saving...' : 'Save mobile number'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-black">Seller verification</h4>
                <p className="mt-1 text-sm text-white/60">
                  ID checks are handled by Stripe Identity. Raw ID files are not stored by CaterBidsUK.
                </p>
                <button
                  type="button"
                  onClick={startIdentityVerification}
                  disabled={trustActionPending || Boolean(profile.government_id_verified)}
                  className="premium-button mt-4 w-full rounded-2xl px-4 py-4 text-sm font-black text-white disabled:opacity-50"
                >
                  Start ID verification
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-black">Business verification</h4>
                <p className="mt-1 text-sm text-white/60">
                  Check your UK company and connect payouts to unlock Verified Business.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Companies House number"
                    value={companiesHouseNumber}
                    onChange={(value) => setCompaniesHouseNumber(value.toUpperCase())}
                    id="companies-house-number"
                  />
                  <InputField
                    label="VAT number optional"
                    value={vatNumber}
                    onChange={(value) => setVatNumber(value.toUpperCase())}
                    id="vat-number"
                  />
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={verificationConsent}
                    onChange={(event) => setVerificationConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#FF6B00]"
                  />
                  <span>
                    I agree that CaterBidsUK can check these business details for verification.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={verifyBusiness}
                  disabled={trustActionPending || Boolean(profile.business_verified)}
                  className="premium-button mt-4 w-full rounded-2xl px-4 py-4 text-sm font-black text-white disabled:opacity-50"
                >
                  {trustActionPending ? 'Checking…' : profile.business_verified ? 'Business verified ✓' : 'Check business'}
                </button>
                {businessVerifyResult && (
                  <p className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                    businessVerifyResult.ok
                      ? 'border border-green-500/30 bg-green-500/10 text-green-200'
                      : 'border border-red-500/30 bg-red-500/10 text-red-200'
                  }`}>
                    {businessVerifyResult.text}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 2: SECURITY */}
          <section id="security" className="premium-card scroll-mt-24 rounded-[2rem] p-6 md:p-8">
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
          <section id="notifications" className="premium-card scroll-mt-24 rounded-[2rem] p-6 md:p-8">
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
                onClick={() => {
                  setDeletePassword('')
                  setDeleteConfirmEmail('')
                  setDeleteTypeConfirm('')
                  setDeleteError('')
                  setShowDeleteModal(true)
                }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/10 py-4 font-bold text-red-400 hover:bg-red-500/20"
              >
                <AlertTriangle size={20} />
                Delete Account
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Account deletion modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#0f1f35] p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-black text-white">Delete your account?</h3>
            <div className="mb-5 space-y-2 text-sm text-white/70">
              <p>This will permanently delete your CaterBids account. Here&apos;s what happens:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Your <strong className="text-white">live listings are removed</strong> from the marketplace immediately.</li>
                <li>Your <strong className="text-white">messages are anonymised</strong> — the other party keeps their conversation history.</li>
                <li><strong className="text-white">Order records are kept</strong> for legal purposes (UK law requires 6 years for financial records), but your personal details are removed.</li>
                <li>Your account is <strong className="text-white">disabled immediately</strong> and permanently purged after 30 days.</li>
              </ul>
            </div>

            <div className="space-y-3">
              {isSocialLogin ? (
                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">
                    Confirm your email address
                  </label>
                  <input
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder={profile.email ?? 'your@email.com'}
                    className="premium-input w-full rounded-2xl px-4 py-3 text-white placeholder-white/30"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">
                    Enter your password
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Current password"
                    className="premium-input w-full rounded-2xl px-4 py-3 text-white placeholder-white/30"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteTypeConfirm}
                  onChange={(e) => setDeleteTypeConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="premium-input w-full rounded-2xl px-4 py-3 font-mono text-white placeholder-white/30"
                />
              </div>
              {deleteError && (
                <p className="text-sm font-bold text-red-400">{deleteError}</p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteSubmitting}
                className="flex-1 rounded-2xl border border-white/20 py-3 font-bold text-white/70 hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitDeleteAccount}
                disabled={deleteSubmitting || deleteTypeConfirm !== 'DELETE'}
                className="flex-1 rounded-2xl bg-red-600 py-3 font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 lg:hidden">
        <div className="mx-auto grid max-w-[430px] grid-cols-5 px-3 py-3 text-center">
          <NavButton icon={<LayoutGrid size={22} />} label="Home" onClick={() => router.push('/')} />
          <NavButton icon={<Search size={22} />} label="Search" onClick={() => router.push('/search')} />
          <NavButton icon={<Plus size={22} />} label="Sell" onClick={() => router.push('/post-listing/start')} special />
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

function TrustStatus({
  icon,
  title,
  text,
  active,
}: {
  icon: ReactNode
  title: string
  text: string
  active: boolean
}) {
  return (
    <div className={`rounded-3xl border p-4 ${
      active
        ? 'border-emerald-400/25 bg-emerald-500/10'
        : 'border-white/10 bg-white/5'
    }`}>
      <div className={`flex items-center gap-2 ${active ? 'text-emerald-200' : 'text-white/75'}`}>
        {icon}
        <span className="font-black">{title}</span>
      </div>
      <p className="mt-2 text-sm text-white/55">{active ? 'Active' : text}</p>
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
