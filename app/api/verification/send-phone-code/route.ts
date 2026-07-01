import { NextRequest } from "next/server"
import { handleSendPhoneCode } from "@/lib/verification/phoneRouteHandlers"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  return handleSendPhoneCode(req)
}
