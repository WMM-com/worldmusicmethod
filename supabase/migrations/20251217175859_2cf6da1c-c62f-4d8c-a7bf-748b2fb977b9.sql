-- Allow provided_by to be nullable (no default selection)
ALTER TABLE public.stage_plot_items 
ALTER COLUMN provided_by DROP DEFAULT,
ALTER COLUMN provided_by DROP NOT NULL;