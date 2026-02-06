import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfilePage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  order_index: number;
  is_home: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all pages for a user
export function useProfilePages(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-pages', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from('profile_pages')
        .select('*')
        .eq('user_id', targetId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ProfilePage[];
    },
    enabled: !!targetId,
  });
}

// Ensure default home page and about page exist
export function useEnsureHomePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Call the database function to ensure home page
      const { data, error } = await supabase.rpc('ensure_default_home_page', {
        p_user_id: user.id,
      });

      if (error) throw error;
      
      // Also check if "About" page exists, if not create it
      const { data: existingPages } = await supabase
        .from('profile_pages')
        .select('slug')
        .eq('user_id', user.id);
      
      const hasAboutPage = existingPages?.some(p => p.slug === 'about');
      
      if (!hasAboutPage) {
        // Create About page
        await supabase
          .from('profile_pages')
          .insert({
            user_id: user.id,
            title: 'About',
            slug: 'about',
            order_index: 1,
            is_home: false,
            is_visible: true,
          });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pages'] });
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
    },
  });
}

// Create a new page
export function useCreatePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, slug }: { title: string; slug: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Get max order_index
      const { data: existing } = await supabase
        .from('profile_pages')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const order_index = (existing?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('profile_pages')
        .insert({
          user_id: user.id,
          title,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          order_index,
          is_home: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pages'] });
      toast.success('Page created');
    },
    onError: (error: any) => {
      if (error.message?.includes('unique_user_slug')) {
        toast.error('A page with this URL already exists');
      } else {
        toast.error(error.message || 'Failed to create page');
      }
    },
  });
}

// Update a page
export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProfilePage> & { id: string }) => {
      const { error } = await supabase
        .from('profile_pages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pages'] });
    },
  });
}

// Delete a page (cannot delete home page)
export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if it's the home page
      const { data: page } = await supabase
        .from('profile_pages')
        .select('is_home')
        .eq('id', id)
        .single();

      if (page?.is_home) {
        throw new Error('Cannot delete the home page');
      }

      // Move sections from this page to home page (set page_id to null for now)
      await supabase
        .from('profile_sections')
        .update({ page_id: null })
        .eq('page_id', id);

      const { error } = await supabase
        .from('profile_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pages'] });
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
      toast.success('Page deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete page');
    },
  });
}

// Reorder pages
export function useReorderPages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pageIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      const updates = pageIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('profile_pages')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pages'] });
    },
  });
}

// Get section count per page (only counts sections assigned to pages)
export function usePageSectionCounts(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['page-section-counts', targetId],
    queryFn: async () => {
      if (!targetId) return {};

      // Only count sections that have a page_id assigned
      const { data, error } = await supabase
        .from('profile_sections')
        .select('page_id')
        .eq('user_id', targetId)
        .not('page_id', 'is', null);

      if (error) throw error;

      // Count sections per page (no unassigned tracking)
      const counts: Record<string, number> = {};
      for (const section of data || []) {
        if (section.page_id) {
          counts[section.page_id] = (counts[section.page_id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!targetId,
  });
}

// Update section's page assignment
export function useUpdateSectionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sectionId, pageId }: { sectionId: string; pageId: string | null }) => {
      const { error } = await supabase
        .from('profile_sections')
        .update({ page_id: pageId })
        .eq('id', sectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
      queryClient.invalidateQueries({ queryKey: ['page-section-counts'] });
    },
  });
}
