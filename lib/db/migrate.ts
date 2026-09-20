import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Client } from "pg"

try {
  process.loadEnvFile(".env.local")
} catch {
  // no .env.local, fall back to process.env
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set")
}

// Direct connection, single client: migrations are session-scoped work.
const client = new Client({ connectionString: url })

await client.connect()
await migrate(drizzle(client), { migrationsFolder: "./lib/db/migrations" })
await client.end()

console.log("migrations applied")
