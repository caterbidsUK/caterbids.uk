'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'image/jpeg'
  return `data:${mimeType};base64,${bytes.toString('base64')}`
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string | null
  const business = formData.get('business') as string | null
  const location = formData.get('location') as string | null
  const phone = formData.get('phone') as string | null
  const file = formData.get('avatar') as File | null
  const fallbackAvatarUrl = formData.get('fallback_avatar_url') as string | null
  const fallbackProfile = {
    id: user.id,
    name,
    business,
    location,
    phone,
    avatar_url: (formData.get('existing_avatar_url') as string | null) || '',
    verified: false,
    created_at: null,
    updated_at: new Date().toISOString(),
  }

  let avatar_url = fallbackProfile.avatar_url
  if (file && file.size > 0) {
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Avatar upload failed:', uploadError)
      avatar_url = fallbackAvatarUrl || await fileToDataUrl(file)
    } else {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      avatar_url = data.publicUrl
    }
  }
  fallbackProfile.avatar_url = avatar_url

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id,
      name, 
      business, 
      location, 
      phone, 
      avatar_url,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) {
    console.error('Profile upsert failed:', error)
    return { success: true, profile: fallbackProfile, storage: 'local' }
  }

  return { success: true, profile, storage: 'supabase' }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  return { success: true }
}
