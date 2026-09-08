CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'awaiting_review', 'committing', 'committed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ingestion_mode" AS ENUM('build', 'expand');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('received', 'processing', 'awaiting_review', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingestion_id" uuid NOT NULL,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"stage" text DEFAULT 'received' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"error_code" text,
	"error_message_safe" text,
	"result_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"mode" "ingestion_mode" NOT NULL,
	"input_type" text DEFAULT 'text' NOT NULL,
	"source_name" text NOT NULL,
	"content_hash" text NOT NULL,
	"raw_text" text NOT NULL,
	"status" "ingestion_status" DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_ingestion_id_ingestions_id_fk" FOREIGN KEY ("ingestion_id") REFERENCES "public"."ingestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestions" ADD CONSTRAINT "ingestions_vault_id_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestions" ADD CONSTRAINT "ingestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_jobs_ingestion_unique" ON "ai_jobs" USING btree ("ingestion_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs" USING btree ("status","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestions_idempotency_unique" ON "ingestions" USING btree ("vault_id","content_hash","mode");--> statement-breakpoint
CREATE INDEX "ingestions_user_vault_idx" ON "ingestions" USING btree ("user_id","vault_id");