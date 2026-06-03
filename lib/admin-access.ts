export const PRIMARY_PROTECTED_SUPER_ADMIN_EMAIL = "caterbidsuk@gmail.com"

function normaliseEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

export function protectedSuperAdminEmails() {
  const configured = String(process.env.CATERBIDS_ADMIN_EMAILS || "")
    .split(",")
    .map(normaliseEmail)
    .filter(Boolean)

  return Array.from(new Set([PRIMARY_PROTECTED_SUPER_ADMIN_EMAIL, ...configured].map(normaliseEmail)))
}

export function isProtectedSuperAdminEmail(email?: string | null) {
  const normalised = normaliseEmail(email)
  return Boolean(normalised && protectedSuperAdminEmails().includes(normalised))
}
