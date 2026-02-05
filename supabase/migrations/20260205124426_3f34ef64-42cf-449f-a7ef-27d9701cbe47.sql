-- Add layout column to profile_sections for flexible grid positioning
ALTER TABLE public.profile_sections 
ADD COLUMN layout TEXT DEFAULT 'full';

-- Add a check constraint for allowed layout values
ALTER TABLE public.profile_sections
ADD CONSTRAINT profile_sections_layout_check CHECK (
  layout IN (
    'full',
    'half-left', 'half-right',
    'third-left', 'third-center', 'third-right',
    'two-thirds-left', 'one-third-right',
    'one-third-left', 'two-thirds-right',
    'three-quarter-left', 'quarter-right',
    'quarter-left', 'three-quarter-right',
    'half-first', 'quarter-second', 'quarter-third',
    'quarter-first', 'quarter-second-alt', 'half-third'
  )
);