DO $$ BEGIN
 CREATE TYPE "public"."category" AS ENUM('frontend', 'backend', 'infra', 'human', 'ai');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "category" DEFAULT 'frontend' NOT NULL,
	"author" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bugs_created_at_idx" ON "bugs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bugs_category_idx" ON "bugs" USING btree ("category");
