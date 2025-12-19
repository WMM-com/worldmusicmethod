import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfileSection {
  id: string;
  user_id: string;
  section_type: string;
  title: string | null;
  content: Record<string, any>;
  order_index: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface ProfileTab {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  order_index: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ExtendedProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  tagline: string | null;
  business_name: string | null;
  username: string | null;
  is_public: boolean;
  profile_type: string;
  website_url: string | null;
  paypal_email: string | null;
  tip_jar_enabled: boolean;
  social_links: Record<string, string>;
  profile_layout: string[];
  created_at: string;
}

// Fetch extended profile with new fields
export function useExtendedProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['extended-profile', targetId],
    queryFn: async () => {
      if (!targetId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      return data as ExtendedProfile;
    },
    enabled: !!targetId,
  });
}

// Fetch public profile by username
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_profile', { p_username: username });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!username,
  });
}

// Profile sections
export function useProfileSections(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-sections', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from('profile_sections')
        .select('*')
        .eq('user_id', targetId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ProfileSection[];
    },
    enabled: !!targetId,
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      section_type, 
      title, 
      content = {} 
    }: { 
      section_type: string; 
      title?: string; 
      content?: Record<string, any>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get max order_index
      const { data: existing } = await supabase
        .from('profile_sections')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const order_index = (existing?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('profile_sections')
        .insert({
          user_id: user.id,
          section_type,
          title,
          content,
          order_index,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
      toast.success('Section added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add section');
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<ProfileSection> & { id: string }) => {
      const { error } = await supabase
        .from('profile_sections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
      toast.success('Section removed');
    },
  });
}

export function useReorderSections() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sectionIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      const updates = sectionIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('profile_sections')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sections'] });
    },
  });
}

// Gallery
export function useProfileGallery(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-gallery', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from('profile_gallery')
        .select('*')
        .eq('user_id', targetId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as GalleryItem[];
    },
    enabled: !!targetId,
  });
}

export function useAddGalleryItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ image_url, caption }: { image_url: string; caption?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('profile_gallery')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const order_index = (existing?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('profile_gallery')
        .insert({
          user_id: user.id,
          image_url,
          caption,
          order_index,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-gallery'] });
      toast.success('Image added to gallery');
    },
  });
}

export function useDeleteGalleryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-gallery'] });
      toast.success('Image removed from gallery');
    },
  });
}

// Profile Tabs
export function useProfileTabs(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-tabs', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from('profile_tabs')
        .select('*')
        .eq('user_id', targetId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ProfileTab[];
    },
    enabled: !!targetId,
  });
}

export function useCreateTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('profile_tabs')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const order_index = (existing?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('profile_tabs')
        .insert({
          user_id: user.id,
          title,
          content,
          order_index,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-tabs'] });
      toast.success('Tab added');
    },
  });
}

export function useUpdateTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProfileTab> & { id: string }) => {
      const { error } = await supabase
        .from('profile_tabs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-tabs'] });
    },
  });
}

export function useDeleteTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_tabs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-tabs'] });
      toast.success('Tab removed');
    },
  });
}

// Profile Projects
export function useProfileProjects(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-projects', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from('profile_projects')
        .select('*')
        .eq('user_id', targetId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ProfileProject[];
    },
    enabled: !!targetId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (project: Omit<ProfileProject, 'id' | 'user_id' | 'order_index' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('profile_projects')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const order_index = (existing?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('profile_projects')
        .insert({
          user_id: user.id,
          ...project,
          order_index,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-projects'] });
      toast.success('Project added');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProfileProject> & { id: string }) => {
      const { error } = await supabase
        .from('profile_projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-projects'] });
      toast.success('Project removed');
    },
  });
}

// Update extended profile
export function useUpdateExtendedProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<ExtendedProfile>) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extended-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}

// Check username availability
export function useCheckUsername() {
  return useMutation({
    mutationFn: async (username: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return !data; // true if available
    },
  });
}
