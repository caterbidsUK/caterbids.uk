import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"

const COMPLETED_ORDER_STATUSES = new Set(["paid", "completed", "delivered", "collected"])

function readRating(value: unknown) {
  const rating = Number(value)
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null
}

function cleanText(value: unknown, maxLength = 800) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get("sellerId")

  if (!sellerId) {
    return NextResponse.json({ error: "sellerId is required" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("seller_reviews")
      .select(
        "id,order_id,listing_id,seller_id,buyer_id,overall_rating,communication_rating,item_accuracy_rating,delivery_rating,review_text,verified_purchase,seller_reply,created_at"
      )
      .eq("seller_id", sellerId)
      .eq("moderation_status", "published")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    const reviews = Array.isArray(data) ? data : []
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((total, review: any) => total + Number(review.overall_rating || 0), 0) / reviews.length
        : 0

    return NextResponse.json({
      reviews,
      summary: {
        reviewCount: reviews.length,
        averageRating: Number(averageRating.toFixed(2)),
      },
    })
  } catch (error) {
    console.warn("Seller reviews unavailable:", error)
    return NextResponse.json({
      reviews: [],
      summary: {
        reviewCount: 0,
        averageRating: 0,
      },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ error: "Sign in to review this seller." }, { status: 401 })
    }

    const body = await req.json()
    const orderId = cleanText(body.orderId || body.order_id, 80)
    const listingId = cleanText(body.listingId || body.listing_id, 80)
    const sellerId = cleanText(body.sellerId || body.seller_id, 80)
    const overallRating = readRating(body.overallRating || body.overall_rating)
    const communicationRating = readRating(body.communicationRating || body.communication_rating)
    const itemAccuracyRating = readRating(body.itemAccuracyRating || body.item_accuracy_rating)
    const deliveryRating = readRating(body.deliveryRating || body.delivery_rating)
    const reviewText = cleanText(body.reviewText || body.review_text)

    if (!orderId || !sellerId || !overallRating || !communicationRating || !itemAccuracyRating || !deliveryRating) {
      return NextResponse.json({ error: "Order, seller and ratings are required." }, { status: 400 })
    }

    if (sellerId === user.id) {
      return NextResponse.json({ error: "You cannot review your own listing." }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,buyer_id,seller_id,listing_id,payment_status,order_status,delivery_status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) throw orderError

    const orderMatchesBuyer = order?.buyer_id === user.id
    const orderMatchesSeller = order?.seller_id === sellerId
    const orderIsComplete =
      COMPLETED_ORDER_STATUSES.has(String(order?.payment_status || "").toLowerCase()) ||
      COMPLETED_ORDER_STATUSES.has(String(order?.order_status || "").toLowerCase()) ||
      COMPLETED_ORDER_STATUSES.has(String(order?.delivery_status || "").toLowerCase())

    if (!order || !orderMatchesBuyer || !orderMatchesSeller || !orderIsComplete) {
      return NextResponse.json(
        { error: "Only verified buyers with a completed order can leave a review." },
        { status: 403 }
      )
    }

    const { data: buyerVerification } = await admin
      .from("profiles")
      .select("email_verified,verified,phone_verified")
      .eq("id", user.id)
      .maybeSingle()

    const buyerVerified = Boolean(
      buyerVerification?.verified ||
        buyerVerification?.email_verified ||
        buyerVerification?.phone_verified
    )

    if (!buyerVerified) {
      return NextResponse.json({ error: "Verify your account before leaving a review." }, { status: 403 })
    }

    const { data: review, error: reviewError } = await admin
      .from("seller_reviews")
      .insert({
        order_id: orderId,
        listing_id: listingId || order.listing_id,
        seller_id: sellerId,
        buyer_id: user.id,
        overall_rating: overallRating,
        communication_rating: communicationRating,
        item_accuracy_rating: itemAccuracyRating,
        delivery_rating: deliveryRating,
        review_text: reviewText || null,
        verified_purchase: true,
      })
      .select("*")
      .single()

    if (reviewError) {
      if (reviewError.code === "23505") {
        return NextResponse.json({ error: "You have already reviewed this order." }, { status: 409 })
      }
      throw reviewError
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error("Could not create seller review:", error)
    return NextResponse.json({ error: "Could not save review." }, { status: 500 })
  }
}
