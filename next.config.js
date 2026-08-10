import { withSentryConfig } from "@sentry/nextjs";

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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: "austin-totty",
  project: "kenmo",
};

const sentryOptions = {
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions);
