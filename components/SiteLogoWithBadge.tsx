import SiteLogo from "@/components/SiteLogo"

export default function SiteLogoWithBadge({
  size = "lg",
  priority = false,
}: {
  size?: "sm" | "lg" | "xl"
  priority?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <SiteLogo size={size} priority={priority} />
      <span className="rounded border border-[#FF6B00]/50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#FF6B00]">
        BETA
      </span>
    </span>
  )
}
