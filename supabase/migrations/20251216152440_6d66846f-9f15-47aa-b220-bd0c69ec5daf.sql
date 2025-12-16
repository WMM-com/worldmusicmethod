-- Add unique constraint on calendar_connections for user_id and provider
-- This enables the upsert operation in the calendar-oauth edge function
ALTER TABLE public.calendar_connections 
ADD CONSTRAINT calendar_connections_user_provider_unique UNIQUE (user_id, provider);