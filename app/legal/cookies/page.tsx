import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "Cookie Policy | CaterBids.uk",
  description:
    "How CaterBids.uk uses cookies and similar tracking technologies. Operated by Colt Price trading as CaterBids.uk.",
}

export default function CookiePolicyPage() {
  return (
    <>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.16),_transparent_34%),linear-gradient(135deg,#001A35_0%,#062747_50%,#00142B_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CaterBids
          </Link>
          <div className="text-right">
            <p className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF6B00]">
              Buy · Sell · Save
            </p>
          </div>
        </header>

        {/* Page header */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Legal</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Cookie Policy</h1>
          <p className="mt-3 text-xs font-semibold text-white/45">Last updated: 25 June 2026</p>
          <div className="mt-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] px-4 py-3 text-sm font-semibold leading-relaxed text-white/70">
            This policy is provided in good faith and is being finalised. If you have any questions,
            contact{" "}
            <a href="mailto:caterbidsuk@gmail.com" className="font-black text-[#FF6B00] hover:underline">
              caterbidsuk@gmail.com
            </a>
            .
          </div>
          <div className="mt-4 space-y-1 text-sm font-semibold text-white/55">
            <p>Colt Price, sole trader trading as CaterBids.uk</p>
            <p>Greyfriars House, Birmingham, B37 5HY</p>
            <p>
              <a href="mailto:caterbidsuk@gmail.com" className="hover:text-[#FF6B00]">
                caterbidsuk@gmail.com
              </a>
            </p>
            <p>
              <a href="https://caterbids.uk" className="hover:text-[#FF6B00]">
                https://caterbids.uk
              </a>
            </p>
          </div>
        </section>

        {/* Body */}
        <div className="mt-4 space-y-3">

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">1. What are cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Cookies are small text files placed on your device when you visit a website. They help
              a website work properly, keep you logged in, remember your preferences, improve
              security, and understand how visitors use the site. Cookies may be set by CaterBids.uk
              directly or by third-party services we use. Similar technologies such as pixels, tags
              and local storage may be used for similar purposes; we refer to all of these as
              &ldquo;cookies&rdquo; here.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">2. Why we use cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We use cookies to provide essential website functions, keep you logged in securely,
              protect accounts and prevent fraud, remember your cookie choices, improve website
              performance, and — where you have given consent — to understand how the site is used.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">3. Essential cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Essential cookies are required for the website to work. These include cookies used for
              login and account sessions, authentication, website security, fraud prevention, cookie
              consent preferences, and basic technical operation. We use essential cookies without
              asking for consent because they are necessary to provide the service you request. You
              can block them in your browser, but parts of CaterBids.uk may not work properly if
              you do.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">4. Non-essential cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Non-essential cookies are not required for basic operation — for example analytics or
              marketing cookies. We will only use non-essential cookies where you have given consent
              through our cookie banner or settings. If at any time we use analytics or marketing
              cookies, they will be listed and controlled through your cookie preferences.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">5. Managing your cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              When you first visit CaterBids.uk you may see a cookie banner allowing you to accept
              or reject non-essential cookies and manage your preferences. Non-essential cookies are
              not placed unless you consent. You can change or withdraw your consent at any time
              using your cookie settings or your browser. Withdrawing consent does not affect cookie
              use that was lawful before you withdrew it.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">6. Browser controls</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Most browsers let you block all cookies, block third-party cookies, delete stored
              cookies, or be alerted before cookies are placed. Check your browser&apos;s help
              section for instructions. If you block all cookies, CaterBids.uk may not work
              properly — for example you may not be able to log in or use account features.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">7. Cookie categories</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/72">
              {[
                ["Essential cookies", "required for login, sessions, security and core functions — used without consent."],
                ["Analytics and performance cookies", "which help us understand and improve how the site is used — require your consent."],
                ["Marketing cookies", "require your consent."],
              ].map(([label, detail]) => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>
                    <span className="font-black text-white/90">{label}</span>:{" "}
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              The specific cookies in use are kept up to date and managed through your cookie
              preferences.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">8. Third-party services</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Some services we use may set cookies or similar technologies, including our hosting
              and authentication provider, our payment provider (Stripe), and login providers where
              you choose to use them. These services process data under their own privacy and cookie
              policies.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">9. Changes to this Cookie Policy</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may update this Cookie Policy from time to time. The latest version will be
              published on{" "}
              <a href="https://caterbids.uk" className="text-[#FF6B00] hover:underline">
                https://caterbids.uk
              </a>
              . If we make significant changes to how we use cookies, we may ask you to update your
              cookie preferences.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">10. Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              For questions about this Cookie Policy, contact CaterBids.uk at{" "}
              <a href="mailto:caterbidsuk@gmail.com" className="text-[#FF6B00] hover:underline">
                caterbidsuk@gmail.com
              </a>
              .
            </p>
          </section>

        </div>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
