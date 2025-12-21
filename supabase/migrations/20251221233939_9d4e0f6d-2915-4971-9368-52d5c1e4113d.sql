-- Remove color column from email_tags (not needed per user request)
ALTER TABLE public.email_tags DROP COLUMN IF EXISTS color;

-- Add purchase/refund tag columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS purchase_tag_id uuid REFERENCES public.email_tags(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS refund_remove_tag boolean DEFAULT true;

-- Create email_lists table
CREATE TABLE IF NOT EXISTS public.email_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create list membership junction table
CREATE TABLE IF NOT EXISTS public.email_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, contact_id)
);

-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent
  scheduled_at timestamptz,
  sent_at timestamptz,
  send_to_lists uuid[] DEFAULT '{}',
  include_tags uuid[] DEFAULT '{}',
  exclude_tags uuid[] DEFAULT '{}',
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add fields column to optin_forms for dynamic form builder
ALTER TABLE public.optin_forms 
ADD COLUMN IF NOT EXISTS fields jsonb DEFAULT '[]'::jsonb;

-- Enable RLS on new tables
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_lists
CREATE POLICY "Admins can manage email lists" ON public.email_lists 
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for email_list_members
CREATE POLICY "Admins can manage list members" ON public.email_list_members 
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for email_campaigns
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns 
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger to new tables
CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON public.email_lists 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();