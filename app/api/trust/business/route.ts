import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"

function clean(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normaliseCompanyNumber(value: string) {
  return value.replace(/\s+/g, "").toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ error: "Sign in to verify a business." }, { status: 401 })
    }

    const body = await req.json()
    const companyNumber = normaliseCompanyNumber(clean(body.companiesHouseNumber || body.companyNumber, 20))
    const vatNumber = clean(body.vatNumber, 32)
    const consentAccepted = Boolean(body.consentAccepted)

    if (!companyNumber || !consentAccepted) {
      return NextResponse.json({ error: "Companies House number and consent are required." }, { status: 400 })
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Business verification is not connected yet.", configured: false },
        { status: 501 }
      )
    }

    const auth = Buffer.from(`${apiKey}:`).toString("base64")
    const response = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, {
      headers: { Authorization: `Basic ${auth}` },
    })

    const company = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: "Companies House API key is invalid or unauthorised." }, { status: 400 })
      }
      if (response.status === 404) {
        return NextResponse.json({ error: "Company number not found on Companies House." }, { status: 400 })
      }
      return NextResponse.json({ error: `Companies House returned ${response.status}.` }, { status: 400 })
    }

    const companyActive = company?.company_status === "active"
    const businessName = clean(company?.company_name || body.businessName, 160)
    const now = new Date().toISOString()
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_connect_onboarding_complete")
      .eq("id", user.id)
      .maybeSingle()
    const stripeConnected = Boolean(profile?.stripe_connect_onboarding_complete)
    const businessVerified = companyActive && stripeConnected
    const businessStatus = businessVerified ? "verified" : companyActive ? "companies_house_matched" : "pending"

    await admin.from("user_verifications" as any).upsert(
      {
        user_id: user.id,
        business_name: businessName,
        companies_house_number: companyNumber,
        vat_number: vatNumber || null,
        business_verification_status: businessStatus,
        business_verified: businessVerified,
        business_verified_at: businessVerified ? now : null,
        stripe_connect_onboarding_complete: stripeConnected,
        verification_consent_at: now,
        verification_consent_version: "trust-v1",
        updated_at: now,
      },
      { onConflict: "user_id" }
    )

    await admin
      .from("profiles")
      .update({
        business: businessName,
        companies_house_number: companyNumber,
        vat_number: vatNumber || null,
        business_verified: businessVerified,
        seller_verification_level: businessVerified ? "business_verified" : "business_pending",
      } as any)
      .eq("id", user.id)

    return NextResponse.json({
      matched: companyActive,
      businessVerified,
      businessName,
      status: businessStatus,
      needsStripeConnect: companyActive && !stripeConnected,
    })
  } catch (error) {
    console.error("Could not verify business:", error)
    return NextResponse.json({ error: "Could not verify business." }, { status: 500 })
  }
}
