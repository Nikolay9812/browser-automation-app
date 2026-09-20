import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk identifiers (org_xxx / user_xxx), not FKs into a local users table.
    organizationId: text("organization_id").notNull(),
    createdBy: text("created_by").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("workflows_organization_id_slug_idx").on(
      table.organizationId,
      table.slug
    ),
    index("workflows_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)

export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
