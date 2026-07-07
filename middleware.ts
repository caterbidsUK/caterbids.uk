import { createMiddlewareClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from "next/server"
import { accountIsLive, adminIsLive, marketplaceIsLive, sellIsLive } from "@/lib/launch-gates"

function redirectWithNoStore(request: NextRequest, destination: string) {
  const redirect = NextResponse.redirect(new URL(destination, request.url))
  redirect.headers.set("Cache-Control", "no-store")
  return redirect
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function productionGate(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDev = process.env.NODE_ENV === "development"

  if (isDev) return null

  // Bypass: set cookie caterbids_preview=<PREVIEW_SECRET> in your browser to
  // access the full site before public launch. Secret is set via env var.
  const previewSecret = process.env.PREVIEW_SECRET
  if (previewSecret && request.cookies.get("caterbids_preview")?.value === previewSecret) {
    return null
  }

  const blogApiRoute = "/api/admin/blog/create"
  const publicRoutes = ["/", "/about", "/privacy", "/privacy-policy", "/terms", "/contact", "/marketplace", "/blog"]
  const isPublicPage = publicRoutes.includes(pathname) || pathname.startsWith("/blog/")

  if (pathname.startsWith("/api/")) {
    if (pathname === blogApiRoute) return null

    return NextResponse.json(
      { error: "This CaterBidsUK feature is not public until launch." },
      { status: 404 }
    )
  }

  if (!adminIsLive() && startsWithAny(pathname, ["/admin"])) {
    return redirectWithNoStore(request, "/")
  }

  if (
    !accountIsLive() &&
    startsWithAny(pathname, [
      "/account",
      "/auth",
      "/checkout",
      "/dashboard",
      "/favourites",
      "/favorites",
      "/login",
      "/messages",
      "/payments",
      "/pricing",
      "/reset-password",
      "/saved",
      "/saved-searches",
      "/settings",
      "/verification",
    ])
  ) {
    return redirectWithNoStore(request, "/")
  }

  if (!sellIsLive() && startsWithAny(pathname, ["/sell", "/post-listing"])) {
    return redirectWithNoStore(request, "/marketplace")
  }

  if (
    !marketplaceIsLive() &&
    startsWithAny(pathname, ["/browse", "/category", "/listing", "/listings", "/marketplace/search", "/search"])
  ) {
    return redirectWithNoStore(request, "/marketplace")
  }

  if (isPublicPage) return null

  return redirectWithNoStore(request, "/")
}

export async function middleware(request: NextRequest) {
  const gateResponse = productionGate(request)
  if (gateResponse) return gateResponse

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
