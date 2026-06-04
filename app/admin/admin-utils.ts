import { redirect } from "next/navigation"
import { isProtectedSuperAdminEmail, PRIMARY_PROTECTED_SUPER_ADMIN_EMAIL } from "@/lib/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const ADMIN_ROLES = ["owner", "admin", "super_admin"] as const
export const PROTECTED_SUPER_ADMIN_EMAIL = PRIMARY_PROTECTED_SUPER_ADMIN_EMAIL

export type AdminRole = (typeof ADMIN_ROLES)[number]

export type AdminProfile = {
  id: string
  email: string | null
  name: string | null
  full_name: string | null
  business: string | null
  role: string | null
}

export type AdminContext = {
  userId: string
  email: string
  profile: AdminProfile
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

function adminProfiles(admin: SupabaseAdminClient) {
  return admin.from("profiles") as any
}

export function isAdminRole(role?: string | null) {
  return ADMIN_ROLES.includes(String(role || "") as AdminRole)
}

function adminAccessLog(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info("CaterBids admin access check:", details)
  }
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await adminProfiles(admin)
    .select("id,email,name,full_name,business,role")
    .eq("id", user.id)
    .maybeSingle()

  let typedProfile = profile as AdminProfile | null
  const email = (user.email || typedProfile?.email || "").trim().toLowerCase()
  const protectedSuperAdmin = isProtectedSuperAdminEmail(email)

  if (!typedProfile && email) {
    const { data: emailProfile } = await adminProfiles(admin)
      .select("id,email,name,full_name,business,role")
      .eq("email", email)
      .maybeSingle()

    typedProfile = emailProfile as AdminProfile | null

    if (typedProfile && typedProfile.id !== user.id && (protectedSuperAdmin || isAdminRole(typedProfile.role))) {
      await adminProfiles(admin)
        .upsert(
          {
            id: user.id,
            email,
            name: typedProfile.name || "CaterBidsUK Admin",
            full_name: typedProfile.full_name || typedProfile.name || "CaterBidsUK Admin",
            business: typedProfile.business,
            role: protectedSuperAdmin ? "super_admin" : typedProfile.role,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "id" }
        )

      typedProfile = {
        ...typedProfile,
        id: user.id,
        email,
        role: protectedSuperAdmin ? "super_admin" : typedProfile.role,
      }
    }
  }

  if (!typedProfile && protectedSuperAdmin) {
    const repairedProfile: AdminProfile = {
      id: user.id,
      email: user.email || PROTECTED_SUPER_ADMIN_EMAIL,
      name: "CaterBidsUK Admin",
      full_name: "CaterBidsUK Admin",
      business: null,
      role: "super_admin",
    }

    await adminProfiles(admin)
      .upsert(
        {
          id: user.id,
          email: repairedProfile.email,
          name: repairedProfile.name,
          full_name: repairedProfile.full_name,
          role: "super_admin",
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "id" }
      )

    typedProfile = repairedProfile
  }

  if (!typedProfile) {
    adminAccessLog({
      email,
      role: null,
      protectedSuperAdmin,
      passed: false,
      reason: "profile_not_found",
    })
    return null
  }

  if (protectedSuperAdmin && typedProfile.role !== "super_admin") {
    await adminProfiles(admin)
      .update({ role: "super_admin", updated_at: new Date().toISOString() } as any)
      .eq("id", user.id)

    typedProfile.role = "super_admin"
  }

  if (!isAdminRole(typedProfile.role) && !protectedSuperAdmin) {
    adminAccessLog({
      email,
      role: typedProfile.role,
      protectedSuperAdmin,
      passed: false,
      reason: "role_not_admin",
    })
    return null
  }

  adminAccessLog({
    email,
    role: protectedSuperAdmin ? "super_admin" : typedProfile.role,
    protectedSuperAdmin,
    passed: true,
  })

  return {
    userId: user.id,
    email: user.email || typedProfile.email || "",
    profile: {
      ...typedProfile,
      role: protectedSuperAdmin ? "super_admin" : typedProfile.role,
    },
  }
}

export async function requireAdmin(next = "/admin") {
  const context = await getAdminContext()

  if (!context) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
    redirect("/account")
  }

  return context
}

export async function writeAdminAuditLog({
  adminUserId,
  adminEmail,
  action,
  entityType,
  entityId,
  metadata,
}: {
  adminUserId: string
  adminEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    const admin = createAdminClient()
    const fullPayload = {
      admin_user_id: adminUserId,
      admin_id: adminUserId,
      admin_email: adminEmail || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      target_table: entityType,
      target_id: entityId || null,
      metadata: metadata || {},
      details: metadata || {},
    }

    const { error } = await admin.from("admin_audit_logs" as any).insert(fullPayload)

    if (!error) return

    await admin.from("admin_audit_logs" as any).insert({
      admin_user_id: adminUserId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
    })
  } catch (error) {
    console.warn("Admin audit log unavailable:", error)
  }
}
