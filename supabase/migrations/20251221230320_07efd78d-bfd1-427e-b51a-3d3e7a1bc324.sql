-- =============================================
-- EMAIL CRM SYSTEM: Tags, Templates, Sequences, Forms, Cart Abandonment
-- =============================================

-- 1. TAGS TABLE - Define all available tags
CREATE TABLE public.email_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. USER TAGS - Assign tags to users/contacts
CREATE TABLE public.user_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT, -- For non-registered users
  tag_id UUID NOT NULL REFERENCES public.email_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual', -- manual, purchase, form_submit, automation
  source_id TEXT, -- Reference to the triggering entity (form_id, product_id, etc.)
  UNIQUE(user_id, tag_id),
  UNIQUE(email, tag_id),
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- 3. EMAIL CONTACTS - Store subscribers/leads who may not be registered users
CREATE TABLE public.email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL, -- Link if they register
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_subscribed BOOLEAN NOT NULL DEFAULT true,
  source TEXT, -- Where they signed up from
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. EMAIL SEQUENCE TEMPLATES - Rich text email content
CREATE TABLE public.email_sequence_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. EMAIL SEQUENCES - Automation sequences
CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- form_submit, purchase, tag_added, cart_abandonment
  trigger_config JSONB DEFAULT '{}', -- Specific trigger settings (form_id, product_id, tag_id, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. EMAIL SEQUENCE STEPS - Individual emails in a sequence
CREATE TABLE public.email_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.email_sequence_templates(id) ON DELETE RESTRICT,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_minutes INTEGER NOT NULL DEFAULT 0, -- Delay from previous step or trigger
  conditions JSONB DEFAULT '{}', -- Optional conditions to check before sending
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- 7. EMAIL SEQUENCE ENROLLMENTS - Track who is in which sequence
CREATE TABLE public.email_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL, -- Denormalized for quick access
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled, paused
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_email_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Store context like cart_items, form_data, etc.
  CONSTRAINT contact_or_user_required CHECK (contact_id IS NOT NULL OR user_id IS NOT NULL)
);

-- 8. EMAIL SEND LOG - Track all sent emails
CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.email_sequence_enrollments(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.email_sequence_steps(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.email_sequence_templates(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, bounced, opened, clicked
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 9. OPT-IN FORMS - Embeddable forms configuration
CREATE TABLE public.optin_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  heading TEXT,
  description TEXT,
  button_text TEXT DEFAULT 'Subscribe',
  success_message TEXT DEFAULT 'Thank you for subscribing!',
  redirect_url TEXT,
  fields JSONB DEFAULT '[{"name": "email", "type": "email", "required": true}]',
  tags_to_assign UUID[] DEFAULT '{}', -- Tag IDs to assign on submission
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL, -- Optional sequence to trigger
  styling JSONB DEFAULT '{}', -- Custom styling options
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. FORM SUBMISSIONS - Track form submissions
CREATE TABLE public.optin_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.optin_forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.email_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  form_data JSONB DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- 11. CART ABANDONMENT TRACKING - Track abandoned carts
CREATE TABLE public.cart_abandonment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT, -- For guest checkouts
  cart_items JSONB NOT NULL, -- Products in cart
  cart_total NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  abandoned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recovered_at TIMESTAMP WITH TIME ZONE, -- If they completed purchase
  recovery_email_sent BOOLEAN DEFAULT false,
  sequence_enrollment_id UUID REFERENCES public.email_sequence_enrollments(id) ON DELETE SET NULL,
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS on all tables
ALTER TABLE public.email_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optin_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optin_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: Admin-only management for CRM tables
CREATE POLICY "Admins can manage email tags" ON public.email_tags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user tags" ON public.user_tags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own tags" ON public.user_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage email contacts" ON public.email_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email templates" ON public.email_sequence_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email sequences" ON public.email_sequences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sequence steps" ON public.email_sequence_steps
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage enrollments" ON public.email_sequence_enrollments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view email send log" ON public.email_send_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage optin forms" ON public.optin_forms
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Public can view active forms (for embedding)
CREATE POLICY "Anyone can view active forms" ON public.optin_forms
  FOR SELECT USING (is_active = true);

-- Service role can insert submissions
CREATE POLICY "Admins can manage form submissions" ON public.optin_form_submissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage cart abandonment" ON public.cart_abandonment
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own cart abandonment" ON public.cart_abandonment
  FOR SELECT USING (auth.uid() = user_id);

-- Updated at triggers
CREATE TRIGGER update_email_tags_updated_at
  BEFORE UPDATE ON public.email_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_contacts_updated_at
  BEFORE UPDATE ON public.email_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequence_templates_updated_at
  BEFORE UPDATE ON public.email_sequence_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequence_steps_updated_at
  BEFORE UPDATE ON public.email_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_optin_forms_updated_at
  BEFORE UPDATE ON public.optin_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user already owns a course (for cart abandonment logic)
CREATE OR REPLACE FUNCTION public.user_owns_course(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND is_active = true
  )
$$;

-- Function to check if email belongs to a user who owns a course
CREATE OR REPLACE FUNCTION public.email_owns_course(p_email TEXT, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.profiles p ON p.id = ce.user_id
    WHERE p.email = p_email
      AND ce.course_id = p_course_id
      AND ce.is_active = true
  )
$$;