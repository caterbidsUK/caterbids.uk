import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.warn("Logout warning:", error)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set("caterbids_dev_auth", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  })
  response.cookies.set("caterbids_dev_auth_client", "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  })

  return response
}
