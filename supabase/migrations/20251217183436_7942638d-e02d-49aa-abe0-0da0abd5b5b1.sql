-- Add channel list fields to stage_plot_items
ALTER TABLE public.stage_plot_items 
ADD COLUMN channel_number integer,
ADD COLUMN phantom_power boolean DEFAULT false,
ADD COLUMN insert_required boolean DEFAULT false,
ADD COLUMN monitor_mixes text[],
ADD COLUMN fx_sends text[];

-- Create index for channel ordering
CREATE INDEX idx_stage_plot_items_channel ON public.stage_plot_items(tech_spec_id, channel_number) WHERE channel_number IS NOT NULL;