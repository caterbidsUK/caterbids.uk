import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

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
    "Buy, sell and save on catering equipment, vans and hospitality assets with CaterBidsUK — BUY • SELL • SAVE.",
  icons: {
    shortcut: "/favicon.ico",
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "CaterBidsUK — The UK Marketplace for Catering Equipment",
    description: "BUY • SELL • SAVE on catering equipment, vans and hospitality assets.",
    siteName: "CaterBidsUK",
    images: ["/images/caterbids-hero-showroom.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#001633] font-sans text-white">
        {children}
        <BottomNav />
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
      </body>
    </html>
  );
}
