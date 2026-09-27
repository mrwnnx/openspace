-- openspace — base complète, en un seul fichier.
-- Appliquée par : npm run installer-base (qui remplace l'indicatif et la
-- longueur des numéros). Ne jamais lancer sur une base existante.

-- ── Numéros de téléphone : la même règle que src/lib/messaging/numeros.ts ──
CREATE OR REPLACE FUNCTION numero_complet(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN d = '' THEN ''
    WHEN d LIKE '00%' THEN substr(d, 3)
    WHEN length(d) = __NATIONAL_NUMBER_LENGTH__ THEN '__DEFAULT_COUNTRY_CODE__' || d
    WHEN length(d) = __NATIONAL_NUMBER_LENGTH__ + 1 AND d LIKE '0%' THEN '__DEFAULT_COUNTRY_CODE__' || substr(d, 2)
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(t, ''), '\D', '', 'g') AS d) x
$$;

-- ── Tables, types et index du schéma (drizzle-kit generate) ──
CREATE TYPE "public"."activity_direction" AS ENUM('inbound', 'outbound');

CREATE TYPE "public"."activity_type" AS ENUM('email', 'whatsapp', 'sms', 'note', 'call', 'status_change', 'comment', 'task', 'webhook_in');

CREATE TYPE "public"."automation_run_status" AS ENUM('pending', 'sent', 'skipped', 'failed', 'cancelled');

CREATE TYPE "public"."bootcamp_status" AS ENUM('draft', 'open', 'in_progress', 'completed', 'cancelled');

CREATE TYPE "public"."call_status" AS ENUM('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'busy', 'no_answer', 'queued', 'canceled');

CREATE TYPE "public"."call_type" AS ENUM('incoming', 'outgoing');

CREATE TYPE "public"."employee_size" AS ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+');

CREATE TYPE "public"."lead_intent" AS ENUM('serieux', 'curieux', 'hors_cible', 'indetermine');

CREATE TYPE "public"."lead_qualification" AS ENUM('chaud', 'tiede', 'froid', 'pas_serieux', 'hors_cible', 'reporte');

CREATE TYPE "public"."notification_type" AS ENUM('lead_assigned', 'lead_status_change', 'deal_status_change', 'task_assigned', 'task_due', 'comment', 'mention', 'lead_enrolled', 'assistant_escalade', 'lead_nouveau');

CREATE TYPE "public"."payment_plan" AS ENUM('total', 'monthly');

CREATE TYPE "public"."reference_type" AS ENUM('lead', 'deal', 'contact', 'organization');

CREATE TYPE "public"."stage_kind" AS ENUM('normal', 'converted', 'lost');

CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');

CREATE TYPE "public"."task_status" AS ENUM('backlog', 'todo', 'in_progress', 'done', 'canceled');

CREATE TYPE "public"."telephony_medium" AS ENUM('manual', 'twilio', 'exotel');

CREATE TYPE "public"."temperature" AS ENUM('hot', 'cold');

CREATE TYPE "public"."view_type" AS ENUM('list', 'kanban', 'group_by');

CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"type" "activity_type" NOT NULL,
	"direction" "activity_direction" DEFAULT 'outbound' NOT NULL,
	"subject" text,
	"content" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ai_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"status" text DEFAULT 'actif' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ai_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"inbound_activity_id" uuid,
	"question" text NOT NULL,
	"draft" text DEFAULT '' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"decision" text NOT NULL,
	"raisons" text DEFAULT '' NOT NULL,
	"sent_text" text,
	"sent_wamid" text,
	"human_reply" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "allowed_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'membre' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "allowed_emails_email_unique" UNIQUE("email")
);

CREATE TABLE "assistant_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "automation_link_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"run_id" uuid,
	"url" text NOT NULL,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" "automation_run_status" NOT NULL,
	"reason" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"resend_id" text,
	"whatsapp_id" text,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"open_count" integer DEFAULT 0 NOT NULL,
	"clicked_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bootcamp_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"email_template_id" uuid,
	"whatsapp_template" text,
	"whatsapp_language" text DEFAULT 'fr' NOT NULL,
	"whatsapp_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"at_hour" integer,
	"active" boolean DEFAULT true NOT NULL,
	"paused_reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "bootcamps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"start_date" date,
	"end_date" date,
	"status" "bootcamp_status" DEFAULT 'open' NOT NULL,
	"capacity" integer,
	"price_total" numeric,
	"currency" text DEFAULT 'TND' NOT NULL,
	"monthly_count" integer,
	"monthly_amount" numeric,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bootcamps_slug_unique" UNIQUE("slug")
);

CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_number" text,
	"to_number" text,
	"status" "call_status" DEFAULT 'initiated' NOT NULL,
	"type" "call_type" DEFAULT 'outgoing' NOT NULL,
	"telephony_medium" "telephony_medium" DEFAULT 'manual' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration" integer DEFAULT 0,
	"recording_url" text,
	"caller_id" text,
	"receiver_id" text,
	"note_id" uuid,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaign_link_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_id" uuid,
	"url" text NOT NULL,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resend_id" text,
	"error" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"open_count" integer DEFAULT 0 NOT NULL,
	"clicked_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"unsubscribed_at" timestamp,
	"unsubscribe_reason" text,
	"unsubscribe_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclude_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"require_phone" boolean DEFAULT false NOT NULL,
	"target_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"internal_note" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salutation" text,
	"first_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"email" text,
	"mobile_no" text,
	"phone" text,
	"whatsapp" text,
	"age" integer,
	"gender" text,
	"image" text,
	"organization_id" uuid,
	"possible_duplicate" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp,
	"unsubscribe_reason" text,
	"unsubscribe_note" text,
	"unsubscribe_token" text NOT NULL,
	"bounced_at" timestamp,
	"bounce_reason" text,
	"whatsapp_consent_at" timestamp,
	"whatsapp_consent_source" text,
	"whatsapp_consent_text" text,
	"whatsapp_unsubscribed_at" timestamp,
	"whatsapp_invalid_at" timestamp,
	"whatsapp_marketing_limited_until" timestamp,
	"whatsapp_marketing_last_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);

CREATE TABLE "deal_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" numeric DEFAULT '1',
	"rate" numeric DEFAULT '0',
	"amount" numeric DEFAULT '0'
);

CREATE TABLE "deal_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);

CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"organization_id" uuid,
	"status_id" uuid,
	"source_id" uuid,
	"industry_id" uuid,
	"territory_id" uuid,
	"probability" numeric DEFAULT '0',
	"deal_value" numeric DEFAULT '0',
	"expected_deal_value" numeric,
	"annual_revenue" numeric,
	"currency" text DEFAULT 'EUR',
	"exchange_rate" numeric DEFAULT '1',
	"owner" text,
	"next_step" text,
	"lost_reason_id" uuid,
	"lost_notes" text,
	"expected_closure_date" date,
	"closed_date" date,
	"first_name" text,
	"last_name" text,
	"email" text,
	"mobile_no" text,
	"phone" text,
	"job_title" text,
	"website" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "digest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sent_on" date NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"leads_listed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "digest_runs_sent_on_unique" UNIQUE("sent_on")
);

CREATE TABLE "email_branding" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"logo_url" text,
	"logo_width" integer DEFAULT 150 NOT NULL,
	"banner_bg" text DEFAULT '#ffffff' NOT NULL,
	"banner_image_url" text,
	"banner_tagline" text,
	"logo_alt" text,
	"logo_position" text DEFAULT 'left' NOT NULL,
	"header_divider" text DEFAULT '#e0e2ea' NOT NULL,
	"body_bg" text DEFAULT '#ffffff' NOT NULL,
	"title_color" text DEFAULT '#212327' NOT NULL,
	"text_color" text DEFAULT '#5b616f' NOT NULL,
	"bold_color" text DEFAULT '#212327' NOT NULL,
	"footnote_color" text DEFAULT '#a4a8b2' NOT NULL,
	"footer_text" text,
	"accent_color" text DEFAULT '#1a1a1a' NOT NULL,
	"primary_btn_text" text DEFAULT '#ffffff' NOT NULL,
	"secondary_btn_bg" text DEFAULT '#ffffff' NOT NULL,
	"secondary_btn_text" text DEFAULT '#3e64de' NOT NULL,
	"secondary_btn_border" text DEFAULT '#3e64de' NOT NULL,
	"button_position" text DEFAULT 'left' NOT NULL,
	"sender_email" text,
	"sender_name" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"button_enabled" boolean DEFAULT false NOT NULL,
	"button_label" text,
	"button_url" text,
	"button_position" text DEFAULT 'bottom' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "form_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bootcamp_id" uuid,
	"name" text NOT NULL,
	"target_status_id" uuid,
	"temperature" "temperature" DEFAULT 'cold',
	"default_tag_ids" jsonb DEFAULT '[]'::jsonb,
	"webhook_token" text NOT NULL,
	"elementor_form_id" text,
	"last_submission_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"field_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_payload" jsonb,
	"last_received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_sources_webhook_token_unique" UNIQUE("webhook_token")
);

CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);

CREATE TABLE "lead_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"intent" "lead_intent" NOT NULL,
	"objection" text,
	"recommendation" text,
	"suggested_temperature" "temperature",
	"temperature_proof" text,
	"next_action" text,
	"wa_signals" jsonb,
	"source_hash" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lead_insights_lead_id_unique" UNIQUE("lead_id")
);

CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);

CREATE TABLE "lead_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"bootcamp_id" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"kind" "stage_kind" DEFAULT 'normal' NOT NULL
);

CREATE TABLE "lead_tags" (
	"lead_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "lead_tags_lead_id_tag_id_pk" PRIMARY KEY("lead_id","tag_id")
);

CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salutation" text,
	"first_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"email" text,
	"mobile_no" text,
	"phone" text,
	"website" text,
	"image" text,
	"job_title" text,
	"organization_name" text,
	"organization_id" uuid,
	"bootcamp_id" uuid,
	"contact_id" uuid,
	"status_id" uuid,
	"source_id" uuid,
	"industry_id" uuid,
	"owner" text,
	"converted" boolean DEFAULT false NOT NULL,
	"last_contacted_at" timestamp,
	"temperature" "temperature" DEFAULT 'cold' NOT NULL,
	"stage_entered_at" timestamp DEFAULT now() NOT NULL,
	"seen_at" timestamp,
	"converted_at" timestamp,
	"raw_payload" jsonb,
	"form_source_id" uuid,
	"intended_plan" "payment_plan",
	"promo_code" text,
	"promo_code_id" uuid,
	"ad_referral" jsonb,
	"no_payment_reminder" boolean DEFAULT false NOT NULL,
	"offer_total" numeric,
	"offer_monthly_count" integer,
	"offer_monthly_amount" numeric,
	"qualification" "lead_qualification",
	"qualified_at" timestamp,
	"next_follow_up_at" timestamp,
	"carried_from_lead_id" uuid,
	"motivation" text,
	"wants_call" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"duplicate_dismissed_at" timestamp
);

CREATE TABLE "lost_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);

CREATE TABLE "note_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"message" text NOT NULL,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"user_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "organisation" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"langue" text DEFAULT '' NOT NULL,
	"adresse" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"logo" text,
	"no_of_employees" "employee_size",
	"annual_revenue" numeric,
	"industry_id" uuid,
	"territory_id" uuid,
	"currency" text DEFAULT 'EUR',
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"plan" "payment_plan" NOT NULL,
	"due_date" date,
	"amount" numeric,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"received_by" text,
	"method" text,
	"proof_path" text,
	"proof_name" text,
	"proof_uploaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"price" numeric DEFAULT '0',
	"currency" text DEFAULT 'EUR',
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"remise_total_pct" numeric,
	"remise_facilite_pct" numeric,
	"valid_from" date,
	"valid_until" date,
	"bootcamp_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assistant_peut_proposer" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);

CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"events" text[] DEFAULT '{"message","escalade","attribue","tache"}' NOT NULL,
	"appareil" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);

CREATE TABLE "stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_status_id" uuid,
	"to_status_id" uuid,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "stage_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stage_tags_status_id_unique" UNIQUE("status_id")
);

CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);

CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assigned_to" text,
	"start_date" date,
	"due_date" timestamp,
	"description" text,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);

CREATE TABLE "view_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"route_name" text NOT NULL,
	"doctype" text NOT NULL,
	"type" "view_type" DEFAULT 'list' NOT NULL,
	"columns" jsonb,
	"filters" jsonb,
	"order_by" jsonb,
	"group_by_field" text,
	"column_field" text,
	"kanban_columns" jsonb,
	"kanban_fields" jsonb,
	"title_field" text,
	"user_id" text,
	"public" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_standard" boolean DEFAULT false NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "whatsapp_blast_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blast_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"whatsapp_id" text,
	CONSTRAINT "whatsapp_blast_targets_unique" UNIQUE("blast_id","lead_id")
);

CREATE TABLE "whatsapp_blasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bootcamp_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"template" text NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cap_policy" text DEFAULT 'reporter' NOT NULL,
	"target_bootcamp_id" uuid,
	"state" text DEFAULT 'running' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);

CREATE TABLE "whatsapp_button_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"button_text" text NOT NULL,
	"tag_id" uuid,
	"reply_text" text,
	"call_slot" text,
	"opt_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "whatsapp_conversations" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"read_at" timestamp,
	"archived_at" timestamp,
	"assigned_to" text
);

CREATE TABLE "whatsapp_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"source_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_links_code_unique" UNIQUE("code")
);

CREATE TABLE "whatsapp_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text,
	"url" text NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text,
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "whatsapp_messages" (
	"wamid" text PRIMARY KEY NOT NULL,
	"activity_id" uuid NOT NULL,
	"template" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"reply_to_wamid" text,
	"reaction_lead" text,
	"reaction_us" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "whatsapp_quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shortcut" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_quick_replies_shortcut_unique" UNIQUE("shortcut")
);

CREATE TABLE "whatsapp_settings" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"ai_reply_enabled" boolean DEFAULT false NOT NULL,
	"welcome_enabled" boolean DEFAULT false NOT NULL,
	"welcome_text" text DEFAULT '' NOT NULL,
	"away_enabled" boolean DEFAULT false NOT NULL,
	"away_text" text DEFAULT '' NOT NULL,
	"away_start" integer DEFAULT 9 NOT NULL,
	"away_end" integer DEFAULT 18 NOT NULL,
	"away_days" text DEFAULT '1,2,3,4,5' NOT NULL,
	"ai_mode" text DEFAULT 'off' NOT NULL,
	"ai_threshold" integer DEFAULT 90 NOT NULL,
	"ai_instructions" text DEFAULT '' NOT NULL,
	"ai_testers" text DEFAULT '' NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"reminder_offsets" integer[] DEFAULT '{-3,0,3}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "wp_connection" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"site_url" text NOT NULL,
	"username" text NOT NULL,
	"app_password" text NOT NULL,
	"last_tested_at" timestamp,
	"last_test_ok" boolean,
	"last_test_message" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "ai_replies" ADD CONSTRAINT "ai_replies_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "ai_replies" ADD CONSTRAINT "ai_replies_inbound_activity_id_activities_id_fk" FOREIGN KEY ("inbound_activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "automation_link_clicks" ADD CONSTRAINT "automation_link_clicks_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "automation_link_clicks" ADD CONSTRAINT "automation_link_clicks_run_id_automation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_runs"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "automations" ADD CONSTRAINT "automations_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "automations" ADD CONSTRAINT "automations_status_id_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "automations" ADD CONSTRAINT "automations_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "campaign_link_clicks" ADD CONSTRAINT "campaign_link_clicks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "campaign_link_clicks" ADD CONSTRAINT "campaign_link_clicks_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_status_id_deal_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."deal_statuses"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_source_id_lead_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_sources"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_lost_reason_id_lost_reasons_id_fk" FOREIGN KEY ("lost_reason_id") REFERENCES "public"."lost_reasons"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "form_sources" ADD CONSTRAINT "form_sources_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "form_sources" ADD CONSTRAINT "form_sources_target_status_id_lead_statuses_id_fk" FOREIGN KEY ("target_status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "lead_insights" ADD CONSTRAINT "lead_insights_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "lead_statuses" ADD CONSTRAINT "lead_statuses_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_status_id_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_source_id_lead_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_sources"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_form_source_id_form_sources_id_fk" FOREIGN KEY ("form_source_id") REFERENCES "public"."form_sources"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stage_history" ADD CONSTRAINT "stage_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stage_tags" ADD CONSTRAINT "stage_tags_status_id_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stage_tags" ADD CONSTRAINT "stage_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_blast_targets" ADD CONSTRAINT "whatsapp_blast_targets_blast_id_whatsapp_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."whatsapp_blasts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_blast_targets" ADD CONSTRAINT "whatsapp_blast_targets_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_blasts" ADD CONSTRAINT "whatsapp_blasts_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_blasts" ADD CONSTRAINT "whatsapp_blasts_status_id_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_blasts" ADD CONSTRAINT "whatsapp_blasts_target_bootcamp_id_bootcamps_id_fk" FOREIGN KEY ("target_bootcamp_id") REFERENCES "public"."bootcamps"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "whatsapp_button_actions" ADD CONSTRAINT "whatsapp_button_actions_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_links" ADD CONSTRAINT "whatsapp_links_source_id_lead_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_sources"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "whatsapp_media" ADD CONSTRAINT "whatsapp_media_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;

-- ── Table lue en SQL direct (hors schéma Drizzle) ──
CREATE TABLE IF NOT EXISTS payment_reminders (
  schedule_id uuid NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sent_at timestamp NOT NULL DEFAULT now(),
  result text,
  PRIMARY KEY (schedule_id, kind),
  CONSTRAINT payment_reminders_kind_check CHECK (kind ~ '^j[+-]?[0-9]+$')
);

-- ── Contraintes de cohérence ──
ALTER TABLE wp_connection ADD CONSTRAINT wp_connection_singleton CHECK (id);
ALTER TABLE email_branding ADD CONSTRAINT email_branding_single_row CHECK (id);
ALTER TABLE whatsapp_settings ADD CONSTRAINT whatsapp_settings_single_row CHECK (id);
ALTER TABLE organisation ADD CONSTRAINT organisation_single_row CHECK (id);
ALTER TABLE whatsapp_settings ADD CONSTRAINT whatsapp_settings_ai_mode_check CHECK (ai_mode IN ('off', 'repetition', 'auto'));
ALTER TABLE whatsapp_settings ADD CONSTRAINT whatsapp_settings_ai_threshold_check CHECK (ai_threshold BETWEEN 50 AND 100);
ALTER TABLE ai_knowledge ADD CONSTRAINT ai_knowledge_kind_check CHECK (kind IN ('texte', 'fichier', 'lien', 'souvenir', 'lecon', 'style', 'question'));
ALTER TABLE ai_knowledge ADD CONSTRAINT ai_knowledge_status_check CHECK (status IN ('actif', 'a_valider', 'archive'));
ALTER TABLE allowed_emails ADD CONSTRAINT allowed_emails_role_check CHECK (role IN ('proprietaire', 'membre'));
ALTER TABLE automations ADD CONSTRAINT automations_channel_coherent CHECK (
  (channel = 'email' AND email_template_id IS NOT NULL) OR (channel = 'whatsapp' AND whatsapp_template IS NOT NULL)
);

-- ── Index de recherche (hors schéma Drizzle) ──
CREATE INDEX IF NOT EXISTS ai_replies_lead_idx ON ai_replies (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_runs_automation_idx ON automation_runs (automation_id);
CREATE INDEX IF NOT EXISTS automation_runs_resend_id_idx ON automation_runs (resend_id);
CREATE INDEX IF NOT EXISTS automations_status_active_idx ON automations (status_id) WHERE active;
CREATE INDEX IF NOT EXISTS contacts_email_coalesce_idx ON contacts ((lower(trim(coalesce(email, '')))));
CREATE INDEX IF NOT EXISTS contacts_mobile_coalesce_idx ON contacts ((lower(trim(coalesce(mobile_no, '')))));
CREATE INDEX IF NOT EXISTS contacts_numero_complet_idx ON contacts (numero_complet(mobile_no));
CREATE INDEX IF NOT EXISTS leads_ad_referral_idx ON leads ((ad_referral->>'source_id')) WHERE ad_referral IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_carried_from_idx ON leads (carried_from_lead_id) WHERE carried_from_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_contact_id_idx ON leads (contact_id);
CREATE INDEX IF NOT EXISTS leads_email_lower_idx ON leads (lower(trim(email)));
CREATE INDEX IF NOT EXISTS leads_numero_complet_idx ON leads (numero_complet(mobile_no), created_at DESC);
CREATE INDEX IF NOT EXISTS leads_promo_code_id_idx ON leads (promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_ref_idx ON notifications (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS stage_history_lead_id_idx ON stage_history (lead_id);
CREATE INDEX IF NOT EXISTS whatsapp_blast_targets_due_idx ON whatsapp_blast_targets (status, scheduled_at);
CREATE INDEX IF NOT EXISTS whatsapp_media_activity_idx ON whatsapp_media (activity_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_activity_idx ON whatsapp_messages (activity_id);

-- ── Données de départ : la formation par défaut et son pipeline ──
-- (src/lib/queries.ts : DEFAULT_BOOTCAMP_ID et DEFAULT_PIPELINE_STAGES)
INSERT INTO bootcamps (id, name, slug, description, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Formation par défaut', 'default',
        'Formation créée à l''installation : elle accueille les leads sans formation.', 'open');
INSERT INTO lead_statuses (name, color, position, is_default, kind, is_system, bootcamp_id) VALUES
  ('Nouveau',   'blue',   0, true,  'normal',    false, '00000000-0000-0000-0000-000000000001'),
  ('Contacté',  'yellow', 1, false, 'normal',    false, '00000000-0000-0000-0000-000000000001'),
  ('Intéressé', 'green',  2, false, 'normal',    false, '00000000-0000-0000-0000-000000000001'),
  ('Inscrit',   'purple', 3, false, 'converted', true,  '00000000-0000-0000-0000-000000000001'),
  ('Perdu',     'red',    4, false, 'lost',      true,  '00000000-0000-0000-0000-000000000001');

-- ── Sécurité : rien n'est lisible avec les clés publiques de Supabase ──
-- Le CRM parle à la base côté serveur (DATABASE_URL, rôle postgres) ; les
-- rôles anon/authenticated de l'API REST de Supabase n'ont accès à rien.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
