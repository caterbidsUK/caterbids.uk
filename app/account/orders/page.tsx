import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Home, PackageCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import InterparcelBookingButton from "@/components/InterparcelBookingButton"
import { validateDeliveryBooking } from "@/lib/delivery/validateDeliveryBooking"

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusLabel(value: string | null | undefined) {
  return (value || "pending").replace(/_/g, " ")
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/account/orders")
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  return (
    <main className="app-bg min-h-screen px-4 pb-10 text-white">
      <header className="bottom-nav sticky top-0 z-50 -mx-4 mb-5 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/account" className="soft-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <ArrowLeft size={18} />
            Account
          </Link>

          <Link href="/" className="text-center">
            <h1 className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">
              ORDERS
            </p>
          </Link>

          <Link href="/" className="soft-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <Home size={18} />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5">
        <section className="premium-shell rounded-[2rem] p-6">
          <div className="orange-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
            <PackageCheck size={24} />
          </div>
          <h1 className="mt-4 text-3xl font-black">Orders</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Stripe test payments will appear here after the webhook creates a CaterBids order.
          </p>
        </section>

        {error && (
          <section className="rounded-3xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 p-5 text-orange-100">
            <h2 className="font-black">Orders table not ready</h2>
            <p className="mt-2 text-sm leading-relaxed text-orange-100/75">
              Run the Supabase orders SQL, then refresh this page.
            </p>
          </section>
        )}

        {!error && (!orders || orders.length === 0) && (
          <section className="premium-card rounded-[2rem] p-8 text-center">
            <PackageCheck className="mx-auto h-10 w-10 text-white/30" />
            <h2 className="mt-4 text-xl font-black">No orders yet</h2>
            <p className="mt-2 text-sm text-white/60">
              No orders found for this logged-in account yet. If you just paid,
              check the Stripe webhook terminal.
            </p>
            <Link href="/search" className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-bold">
              Search listings
            </Link>
          </section>
        )}

        {!error && orders && orders.length > 0 && (
          <section className="grid gap-4">
            {orders.map((order) => {
              const isSellerOrder = order.seller_id === user.id
              const deliveryValidation = validateDeliveryBooking(order)

              return (
              <article key={order.id} className="premium-card rounded-[2rem] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                      {order.buyer_id === user.id ? "Purchase" : "Sale"}
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      {order.item_title || "CaterBids item"}
                    </h2>
                    <p className="mt-1 break-all text-xs text-white/45">
                      Listing: {order.listing_id}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-[#FF6B00]">£{money(order.total_price)}</p>
                    <p className="text-xs font-bold capitalize text-white/55">
                      {statusLabel(order.order_status)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase text-white/40">Item</p>
                    <p className="mt-1 font-black">£{money(order.item_price)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase text-white/40">Delivery</p>
                    <p className="mt-1 font-black">
                      {order.delivery_name || "Not selected"} - £{money(order.delivery_price)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase text-white/40">Payment</p>
                    <p className="mt-1 font-black capitalize">{statusLabel(order.payment_status)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="text-xs font-bold uppercase text-white/40">Shipping</p>
                  <p className="mt-1 font-black capitalize">{statusLabel(order.delivery_status)}</p>
                  {order.delivery_booking_reference && (
                    <p className="mt-1 break-all text-xs text-white/55">
                      Booking: {order.delivery_booking_reference}
                    </p>
                  )}
                  {order.delivery_tracking_number && (
                    <p className="mt-1 break-all text-xs text-white/55">
                      Tracking: {order.delivery_tracking_number}
                    </p>
                  )}
                  {order.delivery_tracking_url && (
                    <Link
                      href={order.delivery_tracking_url}
                      className="mt-2 inline-flex text-xs font-black text-[#FF9A4A] underline-offset-4 hover:underline"
                    >
                      Open tracking
                    </Link>
                  )}
                  {order.buyer_delivery_postcode && (
                    <p className="mt-2 text-xs text-white/55">
                      Buyer delivery: {order.buyer_delivery_postcode}
                    </p>
                  )}
                </div>

                {isSellerOrder && order.delivery_booking_required && order.delivery_status !== "booked" && (
                  <InterparcelBookingButton
                    orderId={order.id}
                    ready={deliveryValidation.ready}
                    missingFields={deliveryValidation.missingFields}
                  />
                )}

                {order.stripe_session_id && (
                  <p className="mt-4 break-all rounded-2xl bg-black/15 p-3 text-[11px] text-white/45">
                    Stripe session: {order.stripe_session_id}
                  </p>
                )}
              </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
