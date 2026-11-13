SET search_path = public;

-- CreateTable
CREATE TABLE "tax_rule_updates" (
    "id" UUID NOT NULL,
    "semantic_key" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'HN',
    "regime" TEXT NOT NULL DEFAULT 'NATURAL_ORDINARY',
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rule_set_id" TEXT,
    "source_url" TEXT NOT NULL,
    "agreement" TEXT,
    "source_digest" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '[]',
    "reason_code" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "fanout_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tax_rule_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rule_sync_state" (
    "id" TEXT NOT NULL,
    "lease_token" UUID,
    "lease_until" TIMESTAMPTZ(6),
    "last_attempt_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "next_check_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "reason_code" TEXT,

    CONSTRAINT "tax_rule_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rule_deliveries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "update_id" UUID NOT NULL,
    "in_app_status" TEXT NOT NULL DEFAULT 'PENDING',
    "email_status" TEXT NOT NULL DEFAULT 'PENDING',
    "lease_token" UUID,
    "lease_until" TIMESTAMPTZ(6),
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_email_attempt_at" TIMESTAMPTZ(6),
    "last_email_attempt_at" TIMESTAMPTZ(6),
    "email_attempts" INTEGER NOT NULL DEFAULT 0,
    "notified_at" TIMESTAMPTZ(6),
    "emailed_at" TIMESTAMPTZ(6),
    "email_provider_id" TEXT,
    "reason_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rule_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_rule_updates_semantic_key_key" ON "tax_rule_updates"("semantic_key");

-- CreateIndex
CREATE INDEX "tax_rule_updates_year_published_at_idx" ON "tax_rule_updates"("year", "published_at" DESC);

-- CreateIndex
CREATE INDEX "tax_rule_updates_status_fanout_complete_published_at_idx" ON "tax_rule_updates"("status", "fanout_complete", "published_at");

-- CreateIndex
CREATE INDEX "tax_rule_deliveries_in_app_status_email_status_next_attempt_idx" ON "tax_rule_deliveries"("in_app_status", "email_status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rule_deliveries_user_id_update_id_key" ON "tax_rule_deliveries"("user_id", "update_id");

-- AddForeignKey
ALTER TABLE "tax_rule_updates" ADD CONSTRAINT "tax_rule_updates_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "tax_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rule_deliveries" ADD CONSTRAINT "tax_rule_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rule_deliveries" ADD CONSTRAINT "tax_rule_deliveries_update_id_fkey" FOREIGN KEY ("update_id") REFERENCES "tax_rule_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE public.tax_rule_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rule_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rule_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_rule_updates, public.tax_rule_sync_state, public.tax_rule_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_rule_updates, public.tax_rule_sync_state, public.tax_rule_deliveries TO service_role;
GRANT SELECT ON public.tax_rule_updates, public.tax_rule_deliveries TO authenticated;
CREATE POLICY tax_rule_updates_read ON public.tax_rule_updates FOR SELECT TO authenticated USING (status='PUBLISHED');
CREATE POLICY tax_rule_deliveries_read ON public.tax_rule_deliveries FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_rule_updates ADD CONSTRAINT tax_rule_updates_values_check CHECK (
 country='HN' AND regime='NATURAL_ORDINARY' AND year BETWEEN 2026 AND 2100
 AND status IN ('PUBLISHED','REVIEW_REQUIRED','UNCHANGED')
 AND semantic_key ~ '^([a-f0-9]{64}|review-[a-f0-9]{64})$'
 AND source_digest ~ '^[a-f0-9]{64}$' AND jsonb_typeof(changes)='array'
 AND (status<>'PUBLISHED' OR (published_at IS NOT NULL AND rule_set_id IS NOT NULL))
);
ALTER TABLE public.tax_rule_deliveries ADD CONSTRAINT tax_rule_deliveries_values_check CHECK (
 in_app_status IN ('PENDING','DELIVERED','SUPPRESSED')
 AND email_status IN ('PENDING','DELIVERED','SUPPRESSED','REVIEW_REQUIRED') AND email_attempts>=0
 AND (in_app_status<>'DELIVERED' OR notified_at IS NOT NULL)
 AND (email_status<>'DELIVERED' OR emailed_at IS NOT NULL)
);
INSERT INTO public.tax_rule_sync_state(id,next_check_at) VALUES ('HN-ISR','1970-01-01T00:00:00Z');
SELECT cron.schedule('fiscal-rule-updates','*/15 * * * *',$cron$
 SELECT net.http_post(
   url:=rtrim(public.app_setting('app_url'),'/') || '/api/cron/tax-rules',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || public.app_setting('cron_secret')),
   body:='{}'::jsonb, timeout_milliseconds:=60000
 );
$cron$);
