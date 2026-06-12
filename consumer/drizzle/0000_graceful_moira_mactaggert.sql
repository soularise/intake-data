CREATE TABLE "consumer_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"mime_type" text,
	"extracted_fields" jsonb,
	"exception_flags" jsonb,
	"document_date" date,
	"vendor_name" text,
	"amount" numeric(10, 2),
	"due_date" date,
	"status" text DEFAULT 'processed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumer_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"relationship" text,
	"unique_email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elders_unique_email_unique" UNIQUE("unique_email")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"subscription_status" text DEFAULT 'trial' NOT NULL,
	"trial_end_date" timestamp with time zone,
	"documents_processed" numeric(10, 0) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "consumer_documents" ADD CONSTRAINT "consumer_documents_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_exceptions" ADD CONSTRAINT "consumer_exceptions_document_id_consumer_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."consumer_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_exceptions" ADD CONSTRAINT "consumer_exceptions_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE no action ON UPDATE no action;