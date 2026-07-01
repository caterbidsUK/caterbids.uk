import { requireAdmin } from "@/app/admin/admin-utils"
import CaterbotReviewClient from "./CaterbotReviewClient"

export const dynamic = "force-dynamic"

export default async function CaterbotReviewPage() {
  await requireAdmin("/admin/caterbot-review")
  return <CaterbotReviewClient />
}
