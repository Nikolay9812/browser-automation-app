import { defineConfig } from "drizzle-kit"

// drizzle-kit runs outside Next.js, so `.env.local` is not loaded for us.
// In CI the variables come from the real environment and the file is absent.
try {
  process.loadEnvFile(".env.local")
} catch {
  // no .env.local, fall back to process.env
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  // Migrations need a direct connection: the pooled endpoint runs PgBouncer in
  // transaction mode and does not keep session state.
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
})
