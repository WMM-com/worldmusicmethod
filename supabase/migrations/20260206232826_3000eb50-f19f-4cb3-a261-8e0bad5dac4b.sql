
-- Create project_reports table for tracking reported issues
CREATE TABLE public.project_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.profile_projects(id) ON DELETE CASCADE,
  reporter_id UUID,
  reporter_email TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
ON public.project_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports (using has_role RPC)
CREATE POLICY "Admins can view all reports"
ON public.project_reports
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.project_reports
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
);
