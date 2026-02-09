
ALTER TABLE public.extended_profiles DROP CONSTRAINT extended_profiles_hero_type_check;
ALTER TABLE public.extended_profiles ADD CONSTRAINT extended_profiles_hero_type_check CHECK (hero_type IN ('standard', 'slay', 'cut-out', 'minimal'));
