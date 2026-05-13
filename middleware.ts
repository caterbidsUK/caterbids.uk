import { createMiddlewareClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const hasDevAuth =
    process.env.NODE_ENV === "development" && request.cookies.get("caterbids_dev_auth")?.value === "1"

  let user = null

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    user = currentUser
  } catch (error) {
    console.warn("Supabase middleware auth unavailable:", error)
  }

  const protectedRoutes = ["/account", "/dashboard", "/settings", "/messages", "/post-listing"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user && !hasDevAuth) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/messages/:path*",
    "/post-listing/:path*",
  ],
}
