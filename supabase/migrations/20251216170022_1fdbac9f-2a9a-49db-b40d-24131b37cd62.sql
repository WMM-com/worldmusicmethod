-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Create policies for receipt uploads
CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);