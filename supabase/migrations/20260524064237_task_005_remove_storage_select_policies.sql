-- TASK-005: Remove broad SELECT policies from storage buckets.
-- Public buckets serve objects by URL without needing a SELECT policy.
-- getPublicUrl() continues working — the policy only controlled bucket listing.
DROP POLICY IF EXISTS "Setup images are publicly readable"     ON storage.objects;
DROP POLICY IF EXISTS "Public can read trade screenshots"      ON storage.objects;
