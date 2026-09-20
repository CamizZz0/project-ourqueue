ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;