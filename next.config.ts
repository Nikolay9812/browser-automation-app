import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = { devIndicators: false }

export default withSentryConfig(nextConfig, {
  org: "codewithantonio-hg",
  project: "browser-automation-app",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client source files for better stack traces
  widenClientFileUpload: true,

  // Proxy Sentry requests through the app to bypass ad-blockers
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
})
