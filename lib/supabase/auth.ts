import type { SupabaseClient, User } from "@supabase/supabase-js"

function getLocalBetaUser() {
  if (
    process.env.NODE_ENV === "development" &&
    typeof document !== "undefined" &&
    document.cookie.split("; ").some((cookie) => cookie === "caterbids_dev_auth_client=1")
  ) {
    return {
      id: "local-beta",
      email: "local-beta@caterbids.uk",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    } as User
  }

  return null
}

function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) return false

  return error.message.toLowerCase().includes("invalid refresh token")
}

async function clearLocalSession(supabase: SupabaseClient) {
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch {
    // The stored session is already unusable, so failing to clear it should not block rendering.
  }
}

export async function getCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (user) {
      return user
    }

    if (error) {
      await clearLocalSession(supabase)
    }
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearLocalSession(supabase)
    } else {
      console.warn("Supabase auth unavailable:", error)
    }
  }

  return getLocalBetaUser()
}
