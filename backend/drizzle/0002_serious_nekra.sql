CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_token" varchar(255) NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_participant_token_unique" UNIQUE("participant_token")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_participant_token_queue_entries_participant_token_fk" FOREIGN KEY ("participant_token") REFERENCES "public"."queue_entries"("participant_token") ON DELETE cascade ON UPDATE no action;