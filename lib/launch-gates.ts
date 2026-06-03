export function isLocalDevelopment() {
  return process.env.NODE_ENV === "development"
}

function flagEnabled(name: string) {
  return process.env[name] === "true"
}

export function marketplaceIsLive() {
  return isLocalDevelopment() || flagEnabled("NEXT_PUBLIC_MARKETPLACE_LIVE")
}

export function adminIsLive() {
  return isLocalDevelopment() || flagEnabled("NEXT_PUBLIC_ADMIN_LIVE")
}

export function accountIsLive() {
  return isLocalDevelopment() || flagEnabled("NEXT_PUBLIC_ACCOUNT_LIVE")
}

export function sellIsLive() {
  return isLocalDevelopment() || flagEnabled("NEXT_PUBLIC_SELL_LIVE")
}
