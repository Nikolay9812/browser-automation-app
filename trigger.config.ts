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
