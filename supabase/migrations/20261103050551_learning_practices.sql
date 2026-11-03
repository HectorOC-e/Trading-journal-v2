CREATE TABLE public.learning_practices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 resource_id uuid REFERENCES public.learning_resources(id) ON DELETE SET NULL,
 title text NOT NULL, date date NOT NULL, duration_min integer NOT NULL CHECK(duration_min BETWEEN 1 AND 1440),
 exercise text NOT NULL, reflection text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_practices_user_id_date_id_idx ON public.learning_practices(user_id,date DESC,id);
CREATE INDEX learning_practices_resource_id_idx ON public.learning_practices(resource_id);
CREATE TABLE public.practice_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), practice_id uuid NOT NULL REFERENCES public.learning_practices(id) ON DELETE CASCADE,
 path text NOT NULL UNIQUE, mime text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_attachments_practice_id_idx ON public.practice_attachments(practice_id);
CREATE TABLE public.practice_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), practice_id uuid NOT NULL REFERENCES public.learning_practices(id) ON DELETE CASCADE,
 version integer NOT NULL, kind text NOT NULL, text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_feedback_practice_id_created_at_idx ON public.practice_feedback(practice_id,created_at DESC);
ALTER TABLE public.learning_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_feedback ENABLE ROW LEVEL SECURITY;
-- Mutations go through the authenticated application server to enforce cross-record ownership and limits.
REVOKE ALL ON public.learning_practices, public.practice_attachments, public.practice_feedback FROM anon, authenticated;
GRANT SELECT ON public.learning_practices, public.practice_attachments, public.practice_feedback TO authenticated;
CREATE POLICY practice_read ON public.learning_practices FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY attachment_read ON public.practice_attachments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.learning_practices p WHERE p.id=practice_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY feedback_read ON public.practice_feedback FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.learning_practices p WHERE p.id=practice_id AND p.user_id=(SELECT auth.uid())));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('practice-images','practice-images',false,5242880,ARRAY['image/png','image/jpeg','image/webp']);
CREATE POLICY practice_image_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='practice-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
