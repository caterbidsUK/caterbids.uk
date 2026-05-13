import { NextResponse } from "next/server"

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }

  return value
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { origin, searchParams } = new URL(request.url)
  const response = NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin))
  response.cookies.set("caterbids_dev_auth", "1", {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
  })
  response.cookies.set("caterbids_dev_auth_client", "1", {
    httpOnly: false,
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
  })

  return response
}
