import * as Sentry from "@sentry/node"
import { tasks } from "@trigger.dev/sdk"

// Loaded automatically by Trigger.dev before any task in `features` runs.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Trigger.dev owns the OpenTelemetry setup; Sentry's default
  // integrations would conflict with it.
  defaultIntegrations: false,
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
})

// Runs once a run has exhausted its retries.
tasks.onFailure(async ({ payload, error, ctx }) => {
  Sentry.captureException(error, {
    tags: { task: ctx.task.id, environment: ctx.environment.type },
    extra: { runId: ctx.run.id, attempt: ctx.attempt.number, payload },
  })
  await Sentry.flush(2000)
})
