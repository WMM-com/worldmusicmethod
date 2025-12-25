-- Add deleted_at column to invoices for soft delete (bin functionality)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient filtering of non-deleted invoices
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices(deleted_at);

-- Update RLS policy to filter out deleted invoices by default
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure the update policy exists
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
CREATE POLICY "Users can update their own invoices" 
ON public.invoices 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure the delete policy exists  
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
CREATE POLICY "Users can delete their own invoices" 
ON public.invoices 
FOR DELETE 
USING (auth.uid() = user_id);