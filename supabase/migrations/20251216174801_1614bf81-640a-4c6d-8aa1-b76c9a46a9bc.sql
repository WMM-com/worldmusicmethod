-- Add 'pencilled' to event_status enum
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'pencilled';