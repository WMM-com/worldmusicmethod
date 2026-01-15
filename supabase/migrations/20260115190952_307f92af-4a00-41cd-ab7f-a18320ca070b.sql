-- Create user_documents table for storing personal documents
CREATE TABLE public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  document_category TEXT, -- e.g., 'id', 'insurance', 'setlist', 'rider', 'prs', 'contract', 'other'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own documents" 
ON public.user_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON public.user_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.user_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.user_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_documents_updated_at
BEFORE UPDATE ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for user documents
INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for document uploads
CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);