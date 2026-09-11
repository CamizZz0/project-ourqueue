CREATE TABLE "queue_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"queue_id" integer NOT NULL,
	"data_peserta" jsonb NOT NULL,
	"nomor_antrean" integer NOT NULL,
	"status" varchar(50) DEFAULT 'waiting' NOT NULL,
	"participant_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_entries_participant_token_unique" UNIQUE("participant_token")
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nama_antrean" varchar(255) NOT NULL,
	"deskripsi" text,
	"enabled_fields" jsonb DEFAULT '["nama","nomor_telepon"]'::jsonb NOT NULL,
	"qr_code_token" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queues_qr_code_token_unique" UNIQUE("qr_code_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;