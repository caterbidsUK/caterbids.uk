import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import LiveChat from "@/components/LiveChat";
import { createAdminClient } from "@/lib/supabase/admin";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://caterbids.uk"),
  title: "CaterBidsUK | The UK Marketplace for Catering Equipment",
  description:
    "Buy, sell and save on new and used catering equipment, vans and hospitality assets across the UK.",
  icons: {
    shortcut: "/favicon.ico",
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "CaterBidsUK | The UK Marketplace for Catering Equipment",
    description: "BUY • SELL • SAVE on catering equipment, vans and hospitality assets.",
    siteName: "CaterBidsUK",
    images: ["/images/caterbids-hero-showroom.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let liveChatEnabled = false
  try {
    const admin = createAdminClient()
    const { data, error } = await (admin.from("site_settings" as any) as any)
      .select("value")
      .eq("key", "live_chat_enabled")
      .maybeSingle()
    if (error) throw error
    // value is raw boolean (initial INSERT) or {text,value,type} object (after admin save)
    const v = data?.value
    liveChatEnabled = v === true || (v !== null && typeof v === "object" && (v as any).value === true)
  } catch (err) {
    console.error("[RootLayout] site_settings read failed for live_chat_enabled — defaulting to false:", err)
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#002E5D' }}
    >
      <body className="flex min-h-full flex-col bg-[#001633] font-sans text-white" style={{ background: '#002E5D' }}>
        {children}
        <BottomNav />
        <LiveChat enabled={liveChatEnabled} />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <Script
          src="//script.crazyegg.com/pages/scripts/0133/3047.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
