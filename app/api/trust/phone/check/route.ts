import { NextRequest } from "next/server"
import { handleVerifyPhoneCode } from "@/lib/verification/phoneRouteHandlers"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  return handleVerifyPhoneCode(req)
}
