-- Enable realtime for merch_sales so artists see sales instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.merch_sales;