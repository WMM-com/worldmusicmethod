-- Add DELETE policy to email_logs table for GDPR compliance
CREATE POLICY "Users can delete own email logs" 
  ON public.email_logs 
  FOR DELETE 
  USING (auth.uid() = user_id);