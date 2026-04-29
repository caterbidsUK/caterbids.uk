import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = await createMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedRoutes = ["/account", "/settings", "/messages", "/post-listing"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/account/:path*",
    "/settings/:path*",
    "/messages/:path*",
    "/post-listing/:path*",
  ],
}
