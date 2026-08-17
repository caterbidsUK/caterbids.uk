import { redirect } from "next/navigation"
import { sellIsLive } from "@/lib/launch-gates"

export default function SellRedirectPage() {
  if (!sellIsLive()) {
    redirect("/search")
  }

  redirect("/post-listing/start")
}
