import { redirect } from "next/navigation"
import { sellIsLive } from "@/lib/launch-gates"

export default function SellRedirectPage() {
  if (!sellIsLive()) {
    redirect("/marketplace")
  }

  redirect("/post-listing/start")
}
