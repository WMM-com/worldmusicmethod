-- Add group settings columns
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "who_can_post": "all_members",
  "allow_polls": true,
  "allow_events": true,
  "allow_images": true,
  "allow_videos": true,
  "allow_audio": true,
  "require_post_approval": false,
  "allow_member_invites": false
}'::jsonb;

-- Add moderation settings
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS welcome_message TEXT;