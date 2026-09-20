import "server-only"

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

// The dev server re-evaluates modules on every HMR pass, which would leak a new
// pool each time. Keep one on globalThis.
const globalForDb = globalThis as typeof globalThis & { pool?: Pool }

const pool =
  globalForDb.pool ??
  new Pool({
    // Pooled (-pooler) connection string. Migrations use the direct one, see drizzle.config.ts.
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool
}

// `casing` must match drizzle.config.ts, or generated migrations and runtime
// queries disagree on column names.
export const db = drizzle(pool, { schema, casing: "snake_case" })

export * from "./schema"
