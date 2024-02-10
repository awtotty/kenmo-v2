import { withSentryConfig } from "@sentry/nextjs";

// Import your environment variables setup as needed
// Ensure this is compatible with ESM; you might need to adjust the env.js export if necessary
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  // Add other Next.js config options here
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: "austin-totty",
  project: "kenmo",
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  // Additional Sentry options...
};

// Note: withSentryConfig is a function that takes a Next.js config and returns an enhanced version of it.
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);

