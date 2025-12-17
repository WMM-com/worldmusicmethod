-- Create tech_specs table for storing named tech specifications
CREATE TABLE public.tech_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage_width INTEGER DEFAULT 800,
  stage_depth INTEGER DEFAULT 600,
  share_token UUID DEFAULT gen_random_uuid(),
  is_publicly_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stage_plot_items table for individual items on the stage plot
CREATE TABLE public.stage_plot_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tech_spec_id UUID NOT NULL REFERENCES public.tech_specs(id) ON DELETE CASCADE,
  icon_type TEXT NOT NULL,
  label TEXT,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  rotation INTEGER DEFAULT 0,
  mic_type TEXT,
  provided_by TEXT NOT NULL DEFAULT 'artist' CHECK (provided_by IN ('artist', 'venue')),
  paired_with_id UUID REFERENCES public.stage_plot_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.tech_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_plot_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for tech_specs
CREATE POLICY "Users can view own tech specs" 
ON public.tech_specs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tech specs" 
ON public.tech_specs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tech specs" 
ON public.tech_specs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tech specs" 
ON public.tech_specs 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view shared tech specs" 
ON public.tech_specs 
FOR SELECT 
USING (share_token IS NOT NULL AND is_publicly_shared = true);

-- RLS policies for stage_plot_items (via tech_spec ownership)
CREATE POLICY "Users can view own stage plot items" 
ON public.stage_plot_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tech_specs 
    WHERE tech_specs.id = stage_plot_items.tech_spec_id 
    AND tech_specs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own stage plot items" 
ON public.stage_plot_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tech_specs 
    WHERE tech_specs.id = stage_plot_items.tech_spec_id 
    AND tech_specs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own stage plot items" 
ON public.stage_plot_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tech_specs 
    WHERE tech_specs.id = stage_plot_items.tech_spec_id 
    AND tech_specs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own stage plot items" 
ON public.stage_plot_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tech_specs 
    WHERE tech_specs.id = stage_plot_items.tech_spec_id 
    AND tech_specs.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view shared stage plot items" 
ON public.stage_plot_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tech_specs 
    WHERE tech_specs.id = stage_plot_items.tech_spec_id 
    AND tech_specs.is_publicly_shared = true
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_tech_specs_updated_at
BEFORE UPDATE ON public.tech_specs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stage_plot_items_updated_at
BEFORE UPDATE ON public.stage_plot_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get shared tech spec by token
CREATE OR REPLACE FUNCTION public.get_shared_tech_spec(p_share_token uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  stage_width integer,
  stage_depth integer,
  owner_name text,
  owner_business text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ts.id,
    ts.name,
    ts.description,
    ts.stage_width,
    ts.stage_depth,
    p.full_name,
    p.business_name
  FROM public.tech_specs ts
  LEFT JOIN public.profiles p ON p.id = ts.user_id
  WHERE ts.share_token = p_share_token
    AND ts.is_publicly_shared = true;
$$;