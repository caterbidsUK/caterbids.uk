"use client"

import Image from "next/image"
import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Menu,
  PackageCheck,
  Percent,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const categoryCards = [
  {
    title: "Catering Equipment",
    description: "Ovens, refrigeration, fryers, preparation equipment and more.",
    image: "/home-equipment-card.png",
    icon: <PackageCheck className="h-7 w-7" strokeWidth={1.8} />,
  },
  {
    title: "Vans & Trailers",
    description: "Food vans, catering trailers and mobile business setups.",
    image: "/home-van-card.png",
    icon: <Truck className="h-7 w-7" strokeWidth={1.8} />,
  },
  {
    title: "Hospitality Businesses",
    description: "Equipment packages and catering business opportunities.",
    image: "/home-business-card.png",
    icon: <Store className="h-7 w-7" strokeWidth={1.8} />,
  },
]

const featureCards = [
  {
    title: "CaterBot Listing Help",
    description: "Upload photos and equipment details to create clearer listings faster.",
    icon: <Bot className="h-7 w-7" strokeWidth={1.8} />,
  },
  {
    title: "Delivery Support",
    description: "Built to help buyers and sellers prepare delivery details for large catering items.",
    icon: <Truck className="h-7 w-7" strokeWidth={1.8} />,
  },
  {
    title: "Verified Seller Tools",
    description: "Designed to build greater buyer trust through seller profiles and verification.",
    icon: <ShieldCheck className="h-7 w-7" strokeWidth={1.8} />,
  },
  {
    title: "No Final Value Fees",
    description: "Pay to list after the launch offer, not a percentage of each sale.",
    icon: <Percent className="h-7 w-7" strokeWidth={1.8} />,
  },
]

type FormStatus = {
  tone: "idle" | "success" | "error"
  message: string
}

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<FormStatus>({ tone: "idle", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const emailInputRef = useRef<HTMLInputElement | null>(null)

  function focusSignup() {
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => emailInputRef.current?.focus(), 350)
  }

  async function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalisedEmail = email.trim().toLowerCase()

    if (!normalisedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
      setStatus({ tone: "error", message: "Enter a valid email address to join the launch list." })
      return
    }

    setSubmitting(true)
    setStatus({ tone: "idle", message: "" })

    try {
      const supabase = createClient()
      const { error } = await supabase.from("waitlist_signups").insert({
        email: normalisedEmail,
        source: "coming_soon_landing_page",
        consent_to_updates: true,
      })

      if (error) {
        const errorText = `${error.code || ""} ${error.message || ""}`.toLowerCase()
        if (error.code === "23505" || errorText.includes("duplicate") || errorText.includes("unique")) {
          setStatus({ tone: "success", message: "You're already signed up for launch updates." })
          return
        }

        throw error
      }

      setEmail("")
      setStatus({
        tone: "success",
        message: "You’re on the launch list. We’ll notify you when CaterBidsUK goes live.",
      })
    } catch (error) {
      console.warn("CaterBidsUK launch signup failed:", error)
      setStatus({
        tone: "error",
        message: "We could not add you just now. Please try again in a moment.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#001225] text-white">
      <section className="relative isolate min-h-[620px] overflow-hidden">
        <Image
          src="/images/caterbids-hero-showroom.png"
          alt="Commercial catering equipment showroom"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,13,30,0.96)_0%,rgba(0,31,66,0.88)_42%,rgba(0,22,48,0.48)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,18,40,0.44)_58%,rgba(0,18,40,0.96)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-14">
          <LandingHeader onSignupClick={focusSignup} />

          <div className="grid flex-1 items-center gap-9 py-12 lg:grid-cols-[1.02fr_0.78fr] lg:py-16">
            <section className="max-w-3xl">
              <span className="inline-flex rounded-full border border-[#FF6B00] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00] shadow-[0_0_28px_rgba(255,107,0,0.16)]">
                Launching Soon
              </span>
              <h1 className="mt-7 text-[3rem] font-black leading-[0.98] tracking-[-0.065em] text-white sm:text-[4.5rem] lg:text-[5.25rem]">
                The UK Marketplace
                <span className="block">
                  for <span className="text-[#FF6B00]">Catering Equipment</span>
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-xl font-bold leading-snug text-white/88 sm:text-2xl">
                Buy, sell and save on catering equipment, vans and hospitality assets.
              </p>
              <div className="mt-8 grid gap-4 text-base font-extrabold text-white sm:text-lg">
                <BenefitLine>First 100 listings free at launch</BenefitLine>
                <BenefitLine>No final value fees. Built for UK catering businesses.</BenefitLine>
              </div>
            </section>

            <HeroLaunchSignup
              email={email}
              setEmail={setEmail}
              status={status}
              submitting={submitting}
              inputRef={emailInputRef}
              onSubmit={submitWaitlist}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#002E5D] px-5 pb-7 pt-9 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1310px]">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Browse the marketplace at launch
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-white/82 sm:text-lg">
              Built for the catering equipment, mobile food and hospitality industry.
            </p>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {categoryCards.map((card) => (
              <MarketplaceCategoryCard key={card.title} {...card} />
            ))}
          </div>

          <WhyCaterBids />
          <LaunchOfferBanner onSignupClick={focusSignup} />
          <LandingFooter />
        </div>
      </section>
    </main>
  )
}

function LandingHeader({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <header className="flex items-center justify-between gap-5">
      <a href="/" className="flex min-w-0 items-center gap-3" aria-label="CaterBidsUK home">
        <Image
          src="/brand/caterbids-logo.png"
          alt="CaterBidsUK bell logo"
          width={72}
          height={72}
          priority
          className="h-14 w-14 shrink-0 rounded-[1.1rem] object-contain shadow-[0_18px_40px_rgba(255,107,0,0.24)] sm:h-[72px] sm:w-[72px]"
        />
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-3xl font-black leading-none tracking-[-0.055em] text-white sm:text-[2.85rem]">
            Cater<span className="text-[#FF6B00]">Bids</span>UK
          </span>
          <span className="mt-1 block whitespace-nowrap text-xs font-black uppercase tracking-[0.29em] text-[#FF6B00] sm:text-base">
            BUY • SELL • SAVE
          </span>
        </span>
      </a>

      <nav className="hidden items-center gap-8 text-base font-extrabold text-white lg:flex" aria-label="Primary">
        <a className="transition hover:text-[#FF6B00]" href="/about">
          About
        </a>
        <button className="transition hover:text-[#FF6B00]" type="button" onClick={onSignupClick}>
          Launch Updates
        </button>
        <a className="transition hover:text-[#FF6B00]" href="/contact">
          Contact
        </a>
        <button
          type="button"
          onClick={onSignupClick}
          className="rounded-xl bg-[#FF6B00] px-6 py-4 font-black text-white shadow-[0_18px_38px_rgba(255,107,0,0.28)] transition hover:brightness-110"
        >
          Get Launch Updates
        </button>
      </nav>

      <button
        type="button"
        aria-label="Get launch updates"
        onClick={onSignupClick}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur lg:hidden"
      >
        <Menu className="h-6 w-6" strokeWidth={2} />
      </button>
    </header>
  )
}

function HeroLaunchSignup({
  email,
  setEmail,
  status,
  submitting,
  inputRef,
  onSubmit,
}: {
  email: string
  setEmail: (value: string) => void
  status: FormStatus
  submitting: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section
      id="launch-updates"
      className="rounded-[1.75rem] bg-white p-6 text-[#001b35] shadow-[0_32px_95px_rgba(0,0,0,0.34)] sm:p-8 lg:ml-auto lg:w-full lg:max-w-[500px]"
      aria-labelledby="launch-updates-heading"
    >
      <h2 id="launch-updates-heading" className="text-3xl font-black tracking-[-0.045em]">
        Get launch updates
      </h2>
      <p className="mt-3 text-base font-semibold leading-relaxed text-[#2d4360]">
        Be first to know when CaterBidsUK goes live and when free launch listings open.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
        <label className="sr-only" htmlFor="launch-email">
          Email address
        </label>
        <input
          ref={inputRef}
          id="launch-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email address"
          autoComplete="email"
          className="min-h-14 rounded-xl border border-[#cbd7e5] bg-white px-4 text-base font-bold text-[#001b35] outline-none transition placeholder:text-slate-400 focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/15"
          style={{ backgroundColor: "#ffffff", color: "#001b35", WebkitTextFillColor: "#001b35" }}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-14 rounded-xl bg-[#FF6B00] px-5 text-base font-black text-white shadow-[0_18px_38px_rgba(255,107,0,0.24)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? "Joining..." : "Notify Me at Launch"}
        </button>
      </form>

      <p className="mt-4 text-sm font-medium leading-relaxed text-[#001b35]">
        By signing up, you agree to receive CaterBidsUK launch updates. You can unsubscribe at any time.
      </p>

      {status.message ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-black ${
            status.tone === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-1 ring-red-200"
          }`}
          role="status"
        >
          {status.message}
        </p>
      ) : null}
    </section>
  )
}

function BenefitLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-6 w-6 shrink-0 text-[#FF6B00]" strokeWidth={2.1} />
      <span>{children}</span>
    </div>
  )
}

function MarketplaceCategoryCard({
  title,
  description,
  image,
  icon,
}: {
  title: string
  description: string
  image: string
  icon: ReactNode
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/28 bg-[#001b35] shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:border-[#FF6B00]/70">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001b35] via-[#001b35]/22 to-transparent" />
      </div>
      <div className="-mt-12 relative z-10 p-6 pt-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF6B00]/60 bg-[#001b35]/92 text-[#FF6B00] shadow-xl">
          {icon}
        </div>
        <h3 className="mt-5 text-2xl font-black tracking-[-0.035em] text-white">{title}</h3>
        <p className="mt-3 min-h-[3.25rem] text-base font-medium leading-relaxed text-white/86">{description}</p>
        <ArrowRight className="mt-5 h-7 w-7 text-[#FF6B00] transition group-hover:translate-x-1" strokeWidth={2} />
      </div>
    </article>
  )
}

function WhyCaterBids() {
  return (
    <section className="mt-7 rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(11,55,100,0.72),rgba(0,21,48,0.74))] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.18)] sm:p-8">
      <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
        Why CaterBidsUK?
      </h2>
      <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/18">
        {featureCards.map((feature) => (
          <article key={feature.title} className="lg:px-7 first:lg:pl-0 last:lg:pr-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#FF6B00] text-[#FF6B00]">
              {feature.icon}
            </div>
            <h3 className="mt-4 text-xl font-black leading-tight text-white">{feature.title}</h3>
            <p className="mt-3 text-base font-medium leading-relaxed text-white/84">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function LaunchOfferBanner({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <section className="relative mt-7 overflow-hidden rounded-2xl bg-white p-5 text-[#001b35] shadow-[0_26px_85px_rgba(0,0,0,0.24)] sm:p-8">
      <Bell className="pointer-events-none absolute -right-3 bottom-1 h-36 w-36 text-[#002E5D]/7" strokeWidth={1.5} />
      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[260px_1fr_auto]">
        <div className="relative h-40 overflow-hidden rounded-2xl bg-[#f2f6fb]">
          <Image
            src="/home-equipment-card.png"
            alt="Commercial catering equipment"
            fill
            sizes="260px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
        </div>
        <div>
          <p className="text-xl font-black">Founding Launch Offer</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.05em] text-[#FF6B00] sm:text-5xl">
            First 100 listings free
          </h2>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-[#102c4d]">
            Be among the first UK catering businesses to list equipment, vans or hospitality assets on CaterBidsUK.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignupClick}
          className="rounded-xl bg-[#FF6B00] px-7 py-4 text-base font-black text-white shadow-[0_18px_38px_rgba(255,107,0,0.24)] transition hover:brightness-110"
        >
          Get Launch Updates
        </button>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="grid gap-7 py-12 text-white lg:grid-cols-[1.6fr_0.8fr_0.8fr_1.25fr] lg:gap-12">
      <section>
        <a href="/" className="flex items-center gap-3" aria-label="CaterBidsUK home">
          <Image
            src="/brand/caterbids-logo.png"
            alt="CaterBidsUK bell logo"
            width={58}
            height={58}
            className="h-14 w-14 rounded-2xl object-contain"
          />
          <span>
            <span className="block text-3xl font-black leading-none tracking-[-0.055em]">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </span>
            <span className="mt-1 block text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">
              BUY • SELL • SAVE
            </span>
          </span>
        </a>
        <p className="mt-4 max-w-sm text-base font-medium leading-relaxed text-white/68">
          The UK Marketplace for Catering Equipment — BUY • SELL • SAVE
        </p>
        <div className="mt-4 flex gap-3" aria-label="Social links coming soon">
          <SocialPlaceholder label="f" />
          <SocialPlaceholder label="ig" />
          <SocialPlaceholder label="in" />
        </div>
        <p className="mt-6 text-sm font-medium text-white/52">© 2026 CaterBidsUK. All rights reserved.</p>
      </section>

      <FooterColumn title="Company" links={[["About", "/about"], ["Launch Updates", "#launch-updates"], ["Contact", "/contact"]]} />
      <FooterColumn title="Support" links={[["Privacy Policy", "/privacy-policy"], ["Terms", "/terms"], ["Contact", "/contact"]]} />

      <section className="rounded-2xl border border-white/14 bg-white/5 p-6 shadow-xl">
        <h3 className="text-lg font-black">Coming soon.</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
          CaterBidsUK is preparing to launch its UK catering marketplace.
        </p>
        <div className="mt-5 flex justify-end">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/12 text-[#FF6B00]">
            <Bell className="h-7 w-7" strokeWidth={1.8} />
          </span>
        </div>
      </section>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title}>
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-4 grid gap-3 text-base font-medium text-white/78">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="transition hover:text-[#FF6B00]">
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function SocialPlaceholder({ label }: { label: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/9 text-xs font-black uppercase text-white/72">
      {label}
    </span>
  )
}
