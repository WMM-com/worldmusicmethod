-- =====================================================
-- Security Fix: Profiles PII Exposure & Email Verification Tokens
-- =====================================================

-- 1. Drop the overly permissive profile SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Authenticated users can view public profiles via view" ON public.profiles;

-- 2. Create policy for users to view their own full profile
DROP POLICY IF EXISTS "Users view own full profile" ON public.profiles;
CREATE POLICY "Users view own full profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 3. Create policy for admins to view all profiles  
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 4. Fix email_verification_tokens - restrict to service role only (drop any permissive policies)
DROP POLICY IF EXISTS "Users can read own tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Anyone can read verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Public can read tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_verification_tokens;

-- Make sure RLS is enabled
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (no policies = service role only via SECURITY DEFINER functions)
-- The verify_email_token function is already SECURITY DEFINER and handles token verification

-- 5. Make user-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'user-documents';

-- 6. Ensure storage policies exist for user-documents bucket (they should, but let's be safe)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);