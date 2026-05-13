import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase URL or key in .env.local")
  }

  return { url, key }
}

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseEnv()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignore in Server Components
        }
      },
    },
  })
}

export function createMiddlewareClient(request: any) {
  let response = NextResponse.next({ request })
  const { url, key } = getSupabaseEnv()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      },
    },
  })

  return { supabase, response }
}
