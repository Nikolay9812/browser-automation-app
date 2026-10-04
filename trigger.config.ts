import * as Sentry from "@sentry/node"
import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: "proj_jjrsidfrzwvcevhutnzo",
  runtime: "node",
  logLevel: "log",
  // Max duration of a task in seconds
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["features"],
  init: async ({ ctx }) => {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Trigger.dev owns the OpenTelemetry setup; Sentry's default
      // integrations would conflict with it.
      defaultIntegrations: false,
      environment: ctx.environment.type.toLowerCase(),
    })
  },
  // Runs once a run has exhausted its retries.
  onFailure: async ({ error, ctx }) => {
    Sentry.captureException(error, {
      tags: { task: ctx.task.id, environment: ctx.environment.type },
      extra: { runId: ctx.run.id, attempt: ctx.attempt.number },
    })
    await Sentry.flush(2000)
  },
  build: {
    // Load these from node_modules rather than bundling them. Stagehand's logger,
    // pino, starts its transports in a worker thread (thread-stream) that
    // resolves lib/worker.js relative to its own file, which breaks once bundled.
    external: [
      "@browserbasehq/stagehand",
      "pino",
      "pino-pretty",
      "pino-abstract-transport",
      "thread-stream",
    ],
  },
})
