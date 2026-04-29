'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export async function updateProfile(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const {
    data: { session },
    error: authError 
  } = await supabase.auth.getSession()
  
  if (authError || !supabase.auth.getUser()?.data.user) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string
  const business = formData.get('business') as string
  const location = formData.get('location') as string
  const phone = formData.get('phone') as string
  const file = formData.get('avatar') as File

  let avatar_url = ''
  if (file && file.size > 0) {
    const filename = `${Date.now()}-${crypto.randomUUID()}.${file.name.split('.').pop()}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    avatar_url = publicUrl.data.publicUrl
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      name, 
      business, 
      location, 
      phone, 
      avatar_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', session?.user.id!)
    .select()
    .single()

  if (error) throw error

  return { success: true }
}

export async function signOut() {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  return { success: true }
}

