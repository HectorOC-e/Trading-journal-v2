
CREATE POLICY "Authenticated users can upload trade screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can read trade screenshots"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'trade-screenshots');

CREATE POLICY "Authenticated users can delete trade screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-screenshots' AND auth.uid() IS NOT NULL);
