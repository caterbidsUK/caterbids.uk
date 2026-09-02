import Image from "next/image"

const SIZES = {
  sm: 44,
  lg: 120,
  xl: 180,
} as const

export default function SiteLogo({
  size = "lg",
  priority = false,
}: {
  size?: "sm" | "lg" | "xl"
  priority?: boolean
}) {
  const h = SIZES[size]
  return (
    <Image
      src="/logo.png"
      alt="CaterBidsUK: Buy, Sell, Save"
      width={1536}
      height={1024}
      priority={priority}
      style={{ height: h, width: "auto" }}
    />
  )
}
