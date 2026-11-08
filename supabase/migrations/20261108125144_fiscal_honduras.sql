-- CreateTable
CREATE TABLE public."tax_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'HN',
    "regime" TEXT NOT NULL DEFAULT 'NATURAL_ORDINARY',
    "name" TEXT NOT NULL DEFAULT '',
    "rtn" TEXT NOT NULL DEFAULT '',
    "domiciled" BOOLEAN NOT NULL DEFAULT true,
    "individual_merchant" BOOLEAN NOT NULL DEFAULT false,
    "activity" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "obligations" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_periods" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "profile_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "regime" TEXT NOT NULL DEFAULT 'NATURAL_ORDINARY',
    "currency" TEXT NOT NULL DEFAULT 'HNL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "profile_snapshot" JSONB NOT NULL,
    "information" JSONB NOT NULL DEFAULT '{}',
    "rounding_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "rounding_reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_asset_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tax_asset_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "reference" TEXT NOT NULL DEFAULT '',
    "reversal_of_id" UUID,
    "transfer_group" UUID,
    "treatment" TEXT NOT NULL DEFAULT 'PENDING',
    "treatment_reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_postings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "asset_key" TEXT NOT NULL,
    "asset_kind" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT '',
    "contract" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(38,18) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRINCIPAL',
    "amount_hnl" DECIMAL(20,2),
    "valuation" JSONB,

    CONSTRAINT "tax_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_incomes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "recognition_date" DATE NOT NULL,
    "asset_kind" TEXT NOT NULL DEFAULT 'FIAT',
    "asset_code" TEXT NOT NULL DEFAULT 'HNL',
    "network" TEXT NOT NULL DEFAULT '',
    "contract" TEXT NOT NULL DEFAULT '',
    "asset_key" TEXT NOT NULL,
    "gross_amount" DECIMAL(38,18) NOT NULL,
    "fee_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "withheld_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(38,18) NOT NULL,
    "amount_hnl" DECIMAL(20,2),
    "valuation" JSONB,
    "treatment" TEXT NOT NULL DEFAULT 'PENDING',
    "treatment_reason" TEXT NOT NULL DEFAULT '',
    "legal_reference" TEXT NOT NULL DEFAULT '',
    "evidence_required" BOOLEAN NOT NULL DEFAULT true,
    "recognition_legal_basis" TEXT NOT NULL DEFAULT '',
    "recognition_criterion" TEXT NOT NULL DEFAULT '',
    "recognition_status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "tax_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_deductions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "asset_kind" TEXT NOT NULL DEFAULT 'FIAT',
    "asset_code" TEXT NOT NULL DEFAULT 'HNL',
    "network" TEXT NOT NULL DEFAULT '',
    "contract" TEXT NOT NULL DEFAULT '',
    "asset_key" TEXT NOT NULL DEFAULT 'FIAT:HNL',
    "amount_hnl" DECIMAL(20,2),
    "valuation" JSONB,
    "admitted_hnl" DECIMAL(20,2),
    "component_key" TEXT NOT NULL,
    "treatment" TEXT NOT NULL DEFAULT 'PENDING',
    "treatment_reason" TEXT NOT NULL DEFAULT '',
    "legal_reference" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_credits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payer" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "amount_hnl" DECIMAL(20,2) NOT NULL,
    "previously_applied_hnl" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "admitted_hnl" DECIMAL(20,2),
    "component_key" TEXT NOT NULL,
    "treatment" TEXT NOT NULL DEFAULT 'PENDING',
    "treatment_reason" TEXT NOT NULL DEFAULT '',
    "legal_reference" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_import_candidates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'WITHDRAWAL',
    "source_id" UUID NOT NULL,
    "source_snapshot" JSONB NOT NULL,
    "source_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_import_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_reconciliations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "candidate_id" UUID,
    "income_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "asset_key" TEXT NOT NULL,
    "gross_amount" DECIMAL(38,18) NOT NULL,
    "net_amount" DECIMAL(38,18) NOT NULL,
    "fee_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "withheld_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "source_amount" DECIMAL(38,18),
    "conversion" JSONB,
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "document_date" DATE,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "supersedes_id" UUID,

    CONSTRAINT "tax_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_returns" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "period_revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshot_hash" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "mapping_version" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3),
    "reported_filed_at" TIMESTAMP(3),
    "filing_reference" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_audit_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "period_id" UUID,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "request_id" UUID,
    "payload_hash" TEXT,
    "result" JSONB,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tax_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_income_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "income_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,

    CONSTRAINT "tax_income_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_transaction_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "transaction_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,

    CONSTRAINT "tax_transaction_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_deduction_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deduction_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,

    CONSTRAINT "tax_deduction_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_credit_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "credit_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,

    CONSTRAINT "tax_credit_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_return_evidences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "return_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,

    CONSTRAINT "tax_return_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."tax_rule_sets" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_profiles_user_id_country_key" ON public."tax_profiles"("user_id", "country");

-- CreateIndex
CREATE UNIQUE INDEX "tax_profiles_user_id_id_key" ON public."tax_profiles"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_periods_user_id_year_idx" ON public."tax_periods"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_profile_id_year_regime_key" ON public."tax_periods"("profile_id", "year", "regime");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_user_id_id_key" ON public."tax_periods"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_asset_accounts_user_id_profile_id_idx" ON public."tax_asset_accounts"("user_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_asset_accounts_user_id_id_key" ON public."tax_asset_accounts"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_transactions_user_id_period_id_date_id_idx" ON public."tax_transactions"("user_id", "period_id", "date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_transactions_user_id_reversal_of_id_key" ON public."tax_transactions"("user_id", "reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_transactions_user_id_id_key" ON public."tax_transactions"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_postings_user_id_account_id_asset_key_idx" ON public."tax_postings"("user_id", "account_id", "asset_key");

-- CreateIndex
CREATE INDEX "tax_postings_user_id_transaction_id_idx" ON public."tax_postings"("user_id", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_postings_user_id_id_key" ON public."tax_postings"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_incomes_user_id_period_id_recognition_date_id_idx" ON public."tax_incomes"("user_id", "period_id", "recognition_date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_incomes_user_id_id_key" ON public."tax_incomes"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_deductions_user_id_period_id_date_id_idx" ON public."tax_deductions"("user_id", "period_id", "date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deductions_user_id_component_key_key" ON public."tax_deductions"("user_id", "component_key");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deductions_user_id_id_key" ON public."tax_deductions"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_credits_user_id_period_id_date_id_idx" ON public."tax_credits"("user_id", "period_id", "date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_credits_user_id_component_key_key" ON public."tax_credits"("user_id", "component_key");

-- CreateIndex
CREATE UNIQUE INDEX "tax_credits_user_id_id_key" ON public."tax_credits"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_import_candidates_user_id_period_id_status_idx" ON public."tax_import_candidates"("user_id", "period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_import_candidates_user_id_source_type_source_id_key" ON public."tax_import_candidates"("user_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_import_candidates_user_id_id_key" ON public."tax_import_candidates"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_reconciliations_user_id_period_id_idx" ON public."tax_reconciliations"("user_id", "period_id");

-- CreateIndex
CREATE INDEX "tax_reconciliations_user_id_income_id_idx" ON public."tax_reconciliations"("user_id", "income_id");

-- CreateIndex
CREATE INDEX "tax_reconciliations_user_id_transaction_id_idx" ON public."tax_reconciliations"("user_id", "transaction_id");

-- CreateIndex
CREATE INDEX "tax_reconciliations_user_id_candidate_id_idx" ON public."tax_reconciliations"("user_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_reconciliations_user_id_id_key" ON public."tax_reconciliations"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_evidences_path_key" ON public."tax_evidences"("path");

-- CreateIndex
CREATE INDEX "tax_evidences_user_id_period_id_status_idx" ON public."tax_evidences"("user_id", "period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_evidences_user_id_id_key" ON public."tax_evidences"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_returns_user_id_period_id_status_idx" ON public."tax_returns"("user_id", "period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_returns_period_id_version_key" ON public."tax_returns"("period_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tax_returns_user_id_id_key" ON public."tax_returns"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_audit_events_user_id_period_id_created_at_id_idx" ON public."tax_audit_events"("user_id", "period_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_audit_events_user_id_request_id_key" ON public."tax_audit_events"("user_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_audit_events_user_id_id_key" ON public."tax_audit_events"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_income_evidences_user_id_evidence_id_idx" ON public."tax_income_evidences"("user_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_income_evidences_income_id_evidence_id_key" ON public."tax_income_evidences"("income_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_income_evidences_user_id_id_key" ON public."tax_income_evidences"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_transaction_evidences_user_id_evidence_id_idx" ON public."tax_transaction_evidences"("user_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_transaction_evidences_transaction_id_evidence_id_key" ON public."tax_transaction_evidences"("transaction_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_transaction_evidences_user_id_id_key" ON public."tax_transaction_evidences"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_deduction_evidences_user_id_evidence_id_idx" ON public."tax_deduction_evidences"("user_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deduction_evidences_deduction_id_evidence_id_key" ON public."tax_deduction_evidences"("deduction_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deduction_evidences_user_id_id_key" ON public."tax_deduction_evidences"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_credit_evidences_user_id_evidence_id_idx" ON public."tax_credit_evidences"("user_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_credit_evidences_credit_id_evidence_id_key" ON public."tax_credit_evidences"("credit_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_credit_evidences_user_id_id_key" ON public."tax_credit_evidences"("user_id", "id");

-- CreateIndex
CREATE INDEX "tax_return_evidences_user_id_evidence_id_idx" ON public."tax_return_evidences"("user_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_return_evidences_return_id_evidence_id_key" ON public."tax_return_evidences"("return_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_return_evidences_user_id_id_key" ON public."tax_return_evidences"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rule_sets_country_regime_year_version_key" ON public."tax_rule_sets"("country", "regime", "year", "version");

-- AddForeignKey
ALTER TABLE public."tax_profiles" ADD CONSTRAINT "tax_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_periods" ADD CONSTRAINT "tax_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_periods" ADD CONSTRAINT "tax_periods_user_id_profile_id_fkey" FOREIGN KEY ("user_id", "profile_id") REFERENCES public."tax_profiles"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_asset_accounts" ADD CONSTRAINT "tax_asset_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_asset_accounts" ADD CONSTRAINT "tax_asset_accounts_user_id_profile_id_fkey" FOREIGN KEY ("user_id", "profile_id") REFERENCES public."tax_profiles"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_transactions" ADD CONSTRAINT "tax_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_transactions" ADD CONSTRAINT "tax_transactions_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_postings" ADD CONSTRAINT "tax_postings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_postings" ADD CONSTRAINT "tax_postings_user_id_transaction_id_fkey" FOREIGN KEY ("user_id", "transaction_id") REFERENCES public."tax_transactions"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_postings" ADD CONSTRAINT "tax_postings_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES public."tax_asset_accounts"("user_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_incomes" ADD CONSTRAINT "tax_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_incomes" ADD CONSTRAINT "tax_incomes_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_deductions" ADD CONSTRAINT "tax_deductions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_deductions" ADD CONSTRAINT "tax_deductions_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_credits" ADD CONSTRAINT "tax_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_credits" ADD CONSTRAINT "tax_credits_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_import_candidates" ADD CONSTRAINT "tax_import_candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_import_candidates" ADD CONSTRAINT "tax_import_candidates_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_reconciliations" ADD CONSTRAINT "tax_reconciliations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_reconciliations" ADD CONSTRAINT "tax_reconciliations_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_reconciliations" ADD CONSTRAINT "tax_reconciliations_user_id_candidate_id_fkey" FOREIGN KEY ("user_id", "candidate_id") REFERENCES public."tax_import_candidates"("user_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_reconciliations" ADD CONSTRAINT "tax_reconciliations_user_id_income_id_fkey" FOREIGN KEY ("user_id", "income_id") REFERENCES public."tax_incomes"("user_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_reconciliations" ADD CONSTRAINT "tax_reconciliations_user_id_transaction_id_fkey" FOREIGN KEY ("user_id", "transaction_id") REFERENCES public."tax_transactions"("user_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_evidences" ADD CONSTRAINT "tax_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_evidences" ADD CONSTRAINT "tax_evidences_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_returns" ADD CONSTRAINT "tax_returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_returns" ADD CONSTRAINT "tax_returns_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_audit_events" ADD CONSTRAINT "tax_audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_audit_events" ADD CONSTRAINT "tax_audit_events_user_id_period_id_fkey" FOREIGN KEY ("user_id", "period_id") REFERENCES public."tax_periods"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_income_evidences" ADD CONSTRAINT "tax_income_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_income_evidences" ADD CONSTRAINT "tax_income_evidences_user_id_income_id_fkey" FOREIGN KEY ("user_id", "income_id") REFERENCES public."tax_incomes"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_income_evidences" ADD CONSTRAINT "tax_income_evidences_user_id_evidence_id_fkey" FOREIGN KEY ("user_id", "evidence_id") REFERENCES public."tax_evidences"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_transaction_evidences" ADD CONSTRAINT "tax_transaction_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_transaction_evidences" ADD CONSTRAINT "tax_transaction_evidences_user_id_transaction_id_fkey" FOREIGN KEY ("user_id", "transaction_id") REFERENCES public."tax_transactions"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_transaction_evidences" ADD CONSTRAINT "tax_transaction_evidences_user_id_evidence_id_fkey" FOREIGN KEY ("user_id", "evidence_id") REFERENCES public."tax_evidences"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_deduction_evidences" ADD CONSTRAINT "tax_deduction_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_deduction_evidences" ADD CONSTRAINT "tax_deduction_evidences_user_id_deduction_id_fkey" FOREIGN KEY ("user_id", "deduction_id") REFERENCES public."tax_deductions"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_deduction_evidences" ADD CONSTRAINT "tax_deduction_evidences_user_id_evidence_id_fkey" FOREIGN KEY ("user_id", "evidence_id") REFERENCES public."tax_evidences"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_credit_evidences" ADD CONSTRAINT "tax_credit_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_credit_evidences" ADD CONSTRAINT "tax_credit_evidences_user_id_credit_id_fkey" FOREIGN KEY ("user_id", "credit_id") REFERENCES public."tax_credits"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_credit_evidences" ADD CONSTRAINT "tax_credit_evidences_user_id_evidence_id_fkey" FOREIGN KEY ("user_id", "evidence_id") REFERENCES public."tax_evidences"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_return_evidences" ADD CONSTRAINT "tax_return_evidences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_return_evidences" ADD CONSTRAINT "tax_return_evidences_user_id_return_id_fkey" FOREIGN KEY ("user_id", "return_id") REFERENCES public."tax_returns"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public."tax_return_evidences" ADD CONSTRAINT "tax_return_evidences_user_id_evidence_id_fkey" FOREIGN KEY ("user_id", "evidence_id") REFERENCES public."tax_evidences"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Fiscal tables are readable by owner, writable only through the authenticated API.
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_profiles TO service_role;
GRANT SELECT ON public.tax_profiles TO authenticated;
CREATE POLICY tax_profiles_read ON public.tax_profiles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_periods FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_periods TO service_role;
GRANT SELECT ON public.tax_periods TO authenticated;
CREATE POLICY tax_periods_read ON public.tax_periods FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_asset_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_asset_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_asset_accounts TO service_role;
GRANT SELECT ON public.tax_asset_accounts TO authenticated;
CREATE POLICY tax_asset_accounts_read ON public.tax_asset_accounts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_transactions TO service_role;
GRANT SELECT ON public.tax_transactions TO authenticated;
CREATE POLICY tax_transactions_read ON public.tax_transactions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_postings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_postings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_postings TO service_role;
GRANT SELECT ON public.tax_postings TO authenticated;
CREATE POLICY tax_postings_read ON public.tax_postings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_incomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_incomes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_incomes TO service_role;
GRANT SELECT ON public.tax_incomes TO authenticated;
CREATE POLICY tax_incomes_read ON public.tax_incomes FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_deductions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_deductions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_deductions TO service_role;
GRANT SELECT ON public.tax_deductions TO authenticated;
CREATE POLICY tax_deductions_read ON public.tax_deductions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_credits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_credits TO service_role;
GRANT SELECT ON public.tax_credits TO authenticated;
CREATE POLICY tax_credits_read ON public.tax_credits FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_import_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_import_candidates FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_import_candidates TO service_role;
GRANT SELECT ON public.tax_import_candidates TO authenticated;
CREATE POLICY tax_import_candidates_read ON public.tax_import_candidates FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_reconciliations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_reconciliations TO service_role;
GRANT SELECT ON public.tax_reconciliations TO authenticated;
CREATE POLICY tax_reconciliations_read ON public.tax_reconciliations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_evidences TO service_role;
GRANT SELECT ON public.tax_evidences TO authenticated;
CREATE POLICY tax_evidences_read ON public.tax_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_returns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_returns FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_returns TO service_role;
GRANT SELECT ON public.tax_returns TO authenticated;
CREATE POLICY tax_returns_read ON public.tax_returns FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_audit_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_audit_events TO service_role;
GRANT SELECT ON public.tax_audit_events TO authenticated;
CREATE POLICY tax_audit_events_read ON public.tax_audit_events FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_income_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_income_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_income_evidences TO service_role;
GRANT SELECT ON public.tax_income_evidences TO authenticated;
CREATE POLICY tax_income_evidences_read ON public.tax_income_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_transaction_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_transaction_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_transaction_evidences TO service_role;
GRANT SELECT ON public.tax_transaction_evidences TO authenticated;
CREATE POLICY tax_transaction_evidences_read ON public.tax_transaction_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_deduction_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_deduction_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_deduction_evidences TO service_role;
GRANT SELECT ON public.tax_deduction_evidences TO authenticated;
CREATE POLICY tax_deduction_evidences_read ON public.tax_deduction_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_credit_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_credit_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_credit_evidences TO service_role;
GRANT SELECT ON public.tax_credit_evidences TO authenticated;
CREATE POLICY tax_credit_evidences_read ON public.tax_credit_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_return_evidences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_return_evidences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_return_evidences TO service_role;
GRANT SELECT ON public.tax_return_evidences TO authenticated;
CREATE POLICY tax_return_evidences_read ON public.tax_return_evidences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND NOT (SELECT private.account_deletion_blocked()));
ALTER TABLE public.tax_rule_sets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_rule_sets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tax_rule_sets TO service_role;
GRANT SELECT ON public.tax_rule_sets TO authenticated;
CREATE POLICY tax_rule_sets_read ON public.tax_rule_sets FOR SELECT TO authenticated USING (published);
ALTER TABLE public.tax_profiles ADD CONSTRAINT tax_profiles_values_check CHECK (country ~ '^[A-Z]{2}$' AND (rtn = '' OR rtn ~ '^[0-9]{14}$'));
ALTER TABLE public.tax_periods ADD CONSTRAINT tax_periods_values_check CHECK (year BETWEEN 2000 AND 2200 AND status IN ('OPEN','CLOSED'));
ALTER TABLE public.tax_asset_accounts ADD CONSTRAINT tax_asset_accounts_values_check CHECK (kind IN ('BANK','EXCHANGE','WALLET','TRANSIT','CASH'));
ALTER TABLE public.tax_transactions ADD CONSTRAINT tax_transactions_values_check CHECK (status IN ('DRAFT','POSTED','REVERSED') AND kind IN ('OPENING_BALANCE','EXTERNAL_RECEIPT','OWN_TRANSFER','CONVERSION','PAYMENT','FEE','ADJUSTMENT','REVERSAL'));
ALTER TABLE public.tax_postings ADD CONSTRAINT tax_postings_values_check CHECK (quantity <> 0 AND asset_kind IN ('FIAT','TOKEN') AND (amount_hnl IS NULL OR amount_hnl >= 0));
ALTER TABLE public.tax_incomes ADD CONSTRAINT tax_incomes_values_check CHECK (gross_amount > 0 AND fee_amount >= 0 AND withheld_amount >= 0 AND net_amount >= 0 AND gross_amount = net_amount + fee_amount + withheld_amount AND (amount_hnl IS NULL OR amount_hnl >= 0));
ALTER TABLE public.tax_deductions ADD CONSTRAINT tax_deductions_values_check CHECK (amount >= 0 AND (amount_hnl IS NULL OR amount_hnl >= 0) AND (admitted_hnl IS NULL OR (admitted_hnl >= 0 AND amount_hnl IS NOT NULL AND admitted_hnl <= amount_hnl)) AND kind IN ('EXPENSE','DEDUCTION'));
ALTER TABLE public.tax_credits ADD CONSTRAINT tax_credits_values_check CHECK (amount_hnl >= 0 AND previously_applied_hnl >= 0 AND previously_applied_hnl <= amount_hnl AND (admitted_hnl IS NULL OR (admitted_hnl >= 0 AND admitted_hnl <= amount_hnl - previously_applied_hnl)));
ALTER TABLE public.tax_reconciliations ADD CONSTRAINT tax_reconciliations_values_check CHECK (gross_amount > 0 AND net_amount >= 0 AND fee_amount >= 0 AND withheld_amount >= 0 AND gross_amount = net_amount + fee_amount + withheld_amount AND (source_amount IS NULL OR source_amount > 0));
ALTER TABLE public.tax_evidences ADD CONSTRAINT tax_evidences_values_check CHECK (status IN ('PENDING','AVAILABLE','REJECTED','REMOVED') AND size > 0 AND size <= 4194304 AND mime IN ('application/pdf','image/jpeg','image/png') AND (sha256 = '' OR sha256 ~ '^[0-9a-f]{64}$') AND split_part(path,'/',1) = user_id::text);
ALTER TABLE public.tax_returns ADD CONSTRAINT tax_returns_values_check CHECK (version > 0 AND period_revision > 0 AND status IN ('DRAFT','IN_REVIEW','READY'));
ALTER TABLE public.tax_incomes ADD CONSTRAINT tax_incomes_treatment_check CHECK (treatment IN ('PENDING','ADMITTED','EXEMPT','NOT_APPLICABLE'));
ALTER TABLE public.tax_deductions ADD CONSTRAINT tax_deductions_treatment_check CHECK (treatment IN ('PENDING','ADMITTED','EXEMPT','NOT_APPLICABLE'));
ALTER TABLE public.tax_credits ADD CONSTRAINT tax_credits_treatment_check CHECK (treatment IN ('PENDING','ADMITTED','EXEMPT','NOT_APPLICABLE'));
ALTER TABLE public.tax_transactions ADD CONSTRAINT tax_transactions_treatment_check CHECK (treatment IN ('PENDING','ADMITTED','EXEMPT','NOT_APPLICABLE'));

-- Private by design: no public or direct authenticated object policies.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('tax-evidence','tax-evidence',false,4194304,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tax_rule_sets(id,country,regime,year,version,published,payload,checksum) VALUES ('HN-ISR-2026-v1','HN','NATURAL_ORDINARY',2026,'HN-ISR-2026-v1',true,$rule${"country":"HN","year":2026,"regime":"NATURAL_ORDINARY","version":"HN-ISR-2026-v1","brackets":[{"upper":"228324.32","rate":"0"},{"upper":"348154.10","rate":"0.15"},{"upper":"809660.75","rate":"0.20"},{"upper":null,"rate":"0.25"}],"rounding":{"mode":"HALF_UP","scale":2,"reviewStatus":"PENDING"},"references":[{"id":"HN-ISR-2026","url":"https://www.sar.gob.hn/download/acuerdo-numero-sar-01-2026-publicado-en-fecha-23-de-enero-del-2026-en-la-gaceta-no-37051/"},{"id":"HN-ISR-2026-GACETA","url":"https://www.tsc.gob.hn/web/leyes/Acuerdo-SAR-01-2026.pdf"}],"consultedOn":"2026-11-08"}$rule$::jsonb,'e7bb226b4f1a64f86c2ffff085bd139568410e1b0d82611f7c114b1a99e7bd4a');

-- Owner-scoped self references; NO ACTION permits the complete User cascade.
ALTER TABLE public.tax_transactions ADD CONSTRAINT tax_transactions_user_id_reversal_of_id_fkey FOREIGN KEY (user_id, reversal_of_id) REFERENCES public.tax_transactions(user_id, id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE public.tax_evidences ADD CONSTRAINT tax_evidences_user_id_supersedes_id_fkey FOREIGN KEY (user_id, supersedes_id) REFERENCES public.tax_evidences(user_id, id) ON DELETE NO ACTION ON UPDATE NO ACTION;
