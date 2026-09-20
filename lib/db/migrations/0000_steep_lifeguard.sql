CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_organization_id_slug_idx" ON "workflows" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "workflows_organization_id_created_at_idx" ON "workflows" USING btree ("organization_id","created_at");