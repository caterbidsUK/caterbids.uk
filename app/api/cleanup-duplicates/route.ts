import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Optional: check auth or secret header for safety
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('cleanup_duplicate_listings')

  if (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    deleted: data?.deleted || 0,
    message: `Cleaned up duplicate listings. Kept oldest by created_at.`
  })
}

