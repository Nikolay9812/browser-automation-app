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
  dirs: ["trigger"],
})
