-- Operational intents survive Auth/User cascades until the deletion worker has
-- swept every bounded privileged upload. Never exposed to authenticated clients.
CREATE TABLE public.tax_upload_leases (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 path text NOT NULL,
 expires_at timestamptz NOT NULL,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tax_upload_leases_user_id_expires_at_idx ON public.tax_upload_leases(user_id,expires_at);
ALTER TABLE public.tax_upload_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tax_upload_leases FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.tax_upload_leases TO service_role;
