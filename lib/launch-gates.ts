export function isLocalDevelopment() {
  return process.env.NODE_ENV === "development"
}

export function marketplaceIsLive() { return true }
export function adminIsLive() { return true }
export function accountIsLive() { return true }
export function sellIsLive() { return true }
