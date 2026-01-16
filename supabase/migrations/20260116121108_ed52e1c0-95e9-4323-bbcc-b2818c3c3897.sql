-- Make user-documents bucket public so files can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';