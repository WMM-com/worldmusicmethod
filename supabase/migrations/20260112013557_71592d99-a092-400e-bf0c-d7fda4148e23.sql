-- Create the menu_items table for admin-configurable navigation
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_type TEXT NOT NULL CHECK (menu_type IN ('desktop', 'mobile', 'profile')),
  label TEXT NOT NULL,
  href TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,
  requires_admin BOOLEAN DEFAULT false,
  sync_with_desktop BOOLEAN DEFAULT false, -- for mobile items that should mirror desktop
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read menu items
CREATE POLICY "Menu items are publicly readable"
ON public.menu_items
FOR SELECT
USING (true);

-- Policy: Only admins can modify menu items
CREATE POLICY "Only admins can modify menu items"
ON public.menu_items
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default menu structure
-- Desktop menu
INSERT INTO public.menu_items (menu_type, label, href, icon, order_index) VALUES
('desktop', 'Learning Hub', NULL, 'BookOpen', 0),
('desktop', 'Membership', '/membership', NULL, 1),
('desktop', 'Community', '/community', 'Users', 2),
('desktop', 'Left Brain', '/dashboard', 'Brain', 3);

-- Get the Learning Hub ID for submenus
DO $$
DECLARE
  learning_hub_id UUID;
BEGIN
  SELECT id INTO learning_hub_id FROM public.menu_items WHERE menu_type = 'desktop' AND label = 'Learning Hub';
  
  INSERT INTO public.menu_items (menu_type, label, href, parent_id, order_index) VALUES
  ('desktop', 'Courses', '/courses', learning_hub_id, 0),
  ('desktop', 'My Courses', '/my-courses', learning_hub_id, 1);
END $$;

-- Mobile menu (synced with desktop by default)
INSERT INTO public.menu_items (menu_type, label, href, icon, order_index, sync_with_desktop) VALUES
('mobile', 'Learning Hub', NULL, 'BookOpen', 0, true),
('mobile', 'Membership', '/membership', NULL, 1, true),
('mobile', 'Community', '/community', 'Users', 2, true),
('mobile', 'Left Brain', '/dashboard', 'Brain', 3, true);

-- Get the Mobile Learning Hub ID for submenus
DO $$
DECLARE
  mobile_learning_hub_id UUID;
BEGIN
  SELECT id INTO mobile_learning_hub_id FROM public.menu_items WHERE menu_type = 'mobile' AND label = 'Learning Hub';
  
  INSERT INTO public.menu_items (menu_type, label, href, parent_id, order_index, sync_with_desktop) VALUES
  ('mobile', 'Courses', '/courses', mobile_learning_hub_id, 0, true),
  ('mobile', 'My Courses', '/my-courses', mobile_learning_hub_id, 1, true);
END $$;

-- Profile dropdown menu
INSERT INTO public.menu_items (menu_type, label, href, icon, order_index, requires_auth) VALUES
('profile', 'Profile', '/profile', 'User', 0, true),
('profile', 'My Courses', '/my-courses', 'BookOpen', 1, true),
('profile', 'My Account', '/account', 'Settings', 2, true),
('profile', 'Admin Dashboard', '/admin', 'Shield', 10, true);

-- Update the admin dashboard item to require admin
UPDATE public.menu_items SET requires_admin = true WHERE label = 'Admin Dashboard' AND menu_type = 'profile';