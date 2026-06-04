import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://caterbids.uk"),
  title: "CaterBidsUK | The UK Marketplace for Catering Equipment",
  description:
    "Buy, sell and save on catering equipment, vans and hospitality assets with CaterBidsUK — BUY • SELL • SAVE.",
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
      </body>
    </html>
  );
}
