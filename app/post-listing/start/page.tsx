import Link from "next/link"

const CATEGORIES = [
  {
    title: "Catering Equipment",
    description:
      "Ovens, fridges, fryers, prep tables and any other standalone catering equipment.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#FF6B00" fillOpacity="0.15" />
        <path d="M10 28h20M13 22h14v6H13zM11 12h18v10H11z" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="20" cy="17" r="2" stroke="#FF6B00" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: "Catering Vans & Trailers",
    description:
      "Food vans, catering trailers, coffee vans, burger vans and horsebox conversions.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#FF6B00" fillOpacity="0.15" />
        <path d="M6 26h28M8 26V18l5-6h14l5 8v6" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="13" cy="28" r="2.5" stroke="#FF6B00" strokeWidth="1.5"/>
        <circle cx="27" cy="28" r="2.5" stroke="#FF6B00" strokeWidth="1.5"/>
        <path d="M13 12h10v8H13z" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Catering Businesses",
    description:
      "Cafés, takeaways, restaurants and other catering businesses for sale as a going concern.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#FF6B00" fillOpacity="0.15" />
        <path d="M8 32h24V18H8v14zM8 18l12-9 12 9" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="15" y="22" width="10" height="10" rx="1" stroke="#FF6B00" strokeWidth="1.5"/>
      </svg>
    ),
  },
]

export default function PostListingStartPage() {
  return (
    <main className="min-h-screen bg-[#002E5D] px-4 pb-16 pt-10 sm:pt-16">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
          CaterBidsUK
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          What are you selling?
        </h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/60">
          Choose a category to start your listing.
        </p>

        <div className="mt-8 space-y-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href={`/post-listing?category=${encodeURIComponent(cat.title)}`}
              className="group flex items-start gap-5 rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-5 text-left text-white transition hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/10"
            >
              <div className="shrink-0">{cat.icon}</div>
              <div>
                <p className="text-base font-black group-hover:text-[#FF6B00] transition-colors">
                  {cat.title}
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">
                  {cat.description}
                </p>
              </div>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="ml-auto mt-0.5 h-5 w-5 shrink-0 text-white/30 group-hover:text-[#FF6B00] transition-colors"
                aria-hidden="true"
              >
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-semibold text-white/40">
          All listings are free during our launch period.
        </p>
      </div>
    </main>
  )
}
