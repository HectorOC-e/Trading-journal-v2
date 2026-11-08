-- Keep the existing durable deletion gate applicable to fiscal objects if a
-- future release adds a direct authenticated Storage policy.
ALTER POLICY account_deletion_blocks_storage_insert ON storage.objects
WITH CHECK (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images','tax-evidence')
 OR NOT (SELECT private.account_deletion_blocked())
);
ALTER POLICY account_deletion_blocks_storage_update ON storage.objects
USING (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images','tax-evidence')
 OR NOT (SELECT private.account_deletion_blocked())
)
WITH CHECK (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images','tax-evidence')
 OR NOT (SELECT private.account_deletion_blocked())
);
