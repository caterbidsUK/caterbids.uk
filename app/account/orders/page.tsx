import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isLocalCourierTestMode } from "@/lib/delivery/deliveryOrders"
import OrdersClient from "./OrdersClient"
import type { Database } from "@/types/supabase"

type Order = Database["public"]["Tables"]["orders"]["Row"]
type DeliveryOrder = Database["public"]["Tables"]["delivery_orders"]["Row"]

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/account/orders")
  }

  const [{ data: orders, error }, { data: deliveryOrders }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("delivery_orders")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase.from("seller_reviews").select("order_id").eq("buyer_id", user.id),
  ])

  const reviewedOrderIds = (reviewRows || []).map((r) => r.order_id)

  return (
    <OrdersClient
      userId={user.id}
      orders={(orders || []) as Order[]}
      deliveryOrders={(deliveryOrders || []) as DeliveryOrder[]}
      reviewedOrderIds={reviewedOrderIds}
      hasError={Boolean(error)}
      testCourierMode={isLocalCourierTestMode()}
    />
  )
}
