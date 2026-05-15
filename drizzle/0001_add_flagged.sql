-- Adds a `flagged` boolean to the bugs table for moderation queue tracking,
-- plus an index for fast filtering of flagged rows on the moderation page.

ALTER TABLE "bugs" ADD COLUMN "flagged" boolean NOT NULL;
--> statement-breakpoint
CREATE INDEX "bugs_flagged_idx" ON "bugs" ("flagged");
