import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sbwsmaxyrkpvrwzddznh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // /marketplace retired — /search is the single browse page
      {
        source: "/marketplace",
        destination: "/search",
        permanent: true,
      },
      // 8 near-identical "buying and selling" duplicates → canonical
      {
        source: "/blog/scaling-your-kitchen-buying-selling-catering-equipment-0ebdc4",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/maximising-your-kitchen-budget-guide-to-used-catering-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/maximising-efficiency-buying-selling-used-commercial-catering-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/maximising-kitchen-budget-buying-selling-used-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/scaling-your-kitchen-buying-selling-catering-equipment-bb7850",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/maximising-catering-budget-buying-selling-used-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/maximising-roi-buying-selling-catering-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      {
        source: "/blog/scaling-your-kitchen-buying-selling-catering-equipment",
        destination: "/blog/maximising-efficiency-guide-buying-selling-commercial-catering-equipment",
        permanent: true,
      },
      // combi valuation duplicate → canonical
      {
        source: "/blog/valuing-commercial-combination-ovens-resale",
        destination: "/blog/commercial-combi-oven-valuation-guide",
        permanent: true,
      },
      // slug contained an accidental admin note; corrected in DB, old URL submitted to GSC
      {
        source: "/blog/commercial-food-preparation-equipment-guide-already-live-published-28-july-2026",
        destination: "/blog/commercial-food-preparation-equipment-guide",
        permanent: true,
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "caterbids",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
