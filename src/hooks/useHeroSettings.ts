import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { HeroType, HeroConfig } from '@/components/profile/HeroSection';
import { Json } from '@/integrations/supabase/types';

export interface HeroSettings {
  id?: string;
  user_id: string;
  hero_type: HeroType;
  hero_config: HeroConfig;
  brand_color: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useHeroSettings(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['hero-settings', targetId],
    queryFn: async () => {
      if (!targetId) return null;

      const { data, error } = await supabase
        .from('extended_profiles')
        .select('*')
        .eq('user_id', targetId)
        .maybeSingle();

      if (error) throw error;
      
      // Return default values if no record exists
      if (!data) {
        return {
          user_id: targetId,
          hero_type: 'standard' as HeroType,
          hero_config: {} as HeroConfig,
          brand_color: null,
        } as HeroSettings;
      }
      
      return {
        ...data,
        hero_type: (data.hero_type || 'standard') as HeroType,
        hero_config: (data.hero_config || {}) as HeroConfig,
      } as HeroSettings;
    },
    enabled: !!targetId,
  });
}

export function useUpdateHeroSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: { hero_type?: string; hero_config?: HeroConfig; brand_color?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      // Cast hero_config to Json for Supabase compatibility
      const dbUpdates: { hero_type?: string; hero_config?: Json; brand_color?: string | null } = {
        ...updates,
        hero_config: updates.hero_config as unknown as Json,
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('extended_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('extended_profiles')
          .update(dbUpdates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('extended_profiles')
          .insert([{
            user_id: user.id,
            hero_type: updates.hero_type || 'standard',
            hero_config: (updates.hero_config || {}) as unknown as Json,
            brand_color: updates.brand_color || null,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-settings'] });
      toast.success('Hero settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}
