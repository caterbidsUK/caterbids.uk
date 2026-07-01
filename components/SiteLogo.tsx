import Image from "next/image"

const SIZES = {
  sm: 44,
  lg: 120,
} as const

export default function SiteLogo({
  size = "lg",
  priority = false,
}: {
  size?: "sm" | "lg"
  priority?: boolean
}) {
  const h = SIZES[size]
  const betaText = size === "lg" ? "text-[10px]" : "text-[9px]"

  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="CaterBidsUK — Buy, Sell, Save"
        width={1536}
        height={1024}
        priority={priority}
        style={{ height: h, width: "auto" }}
      />
      <span
        className={`rounded-full bg-[#FF6B00] px-2 py-0.5 ${betaText} font-black uppercase tracking-wider text-white`}
      >
        BETA
      </span>
    </span>
  )
}
