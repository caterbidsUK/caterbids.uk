import { createMiddlewareClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const protectedRoutes = ["/account", "/dashboard", "/settings", "/messages", "/post-listing"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

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

  if (isProtectedRoute && !user && !hasDevAuth) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    const redirect = NextResponse.redirect(loginUrl)
    redirect.headers.set("Cache-Control", "no-store")
    return redirect
  }

  response.headers.set("Cache-Control", "private, no-store")
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf)$).*)",
  ],
}
