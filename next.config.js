import { withSentryConfig } from "@sentry/nextjs/config";

/**
 * Run `build` or `dev` with SKIP_ENV_VALIDATION=1 to skip env validation.
 * This is useful for Docker/CI steps that do not have deployment secrets.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  async rewrites() {
    return [{ source: "/monitoring", destination: "/api/monitoring" }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "austin-totty",
  project: "kenmo",
  widenClientFileUpload: true,
  // Explicit false also prevents Sentry from generating an App Router tunnel
  // and a broad envelope rewrite during Vercel builds. We serve it behind Clerk.
  tunnelRoute: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  bundleSizeOptimizations: { excludeDebugStatements: true },
  webpack: { automaticVercelMonitors: true },
});
