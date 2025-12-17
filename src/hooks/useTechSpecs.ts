import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TechSpec, StagePlotItem, IconType, ProvidedBy, MicType } from '@/types/techSpec';
import { toast } from 'sonner';

export function useTechSpecs() {
  const { user } = useAuth();
  const [techSpecs, setTechSpecs] = useState<TechSpec[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTechSpecs = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('tech_specs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tech specs:', error);
      toast.error('Failed to load tech specs');
    } else {
      setTechSpecs(data as TechSpec[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTechSpecs();
  }, [fetchTechSpecs]);

  const createTechSpec = async (name: string, description?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('tech_specs')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tech spec:', error);
      toast.error('Failed to create tech spec');
      return null;
    }

    toast.success('Tech spec created');
    await fetchTechSpecs();
    return data as TechSpec;
  };

  const updateTechSpec = async (id: string, updates: Partial<TechSpec>) => {
    const { error } = await supabase
      .from('tech_specs')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating tech spec:', error);
      toast.error('Failed to update tech spec');
      return false;
    }

    toast.success('Tech spec updated');
    await fetchTechSpecs();
    return true;
  };

  const deleteTechSpec = async (id: string) => {
    const { error } = await supabase
      .from('tech_specs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tech spec:', error);
      toast.error('Failed to delete tech spec');
      return false;
    }

    toast.success('Tech spec deleted');
    await fetchTechSpecs();
    return true;
  };

  const togglePublicShare = async (id: string, isPublic: boolean) => {
    return updateTechSpec(id, { is_publicly_shared: isPublic });
  };

  return {
    techSpecs,
    loading,
    createTechSpec,
    updateTechSpec,
    deleteTechSpec,
    togglePublicShare,
    refetch: fetchTechSpecs,
  };
}

export function useStagePlotItems(techSpecId: string | null) {
  const [items, setItems] = useState<StagePlotItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!techSpecId) {
      setItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('stage_plot_items')
      .select('*')
      .eq('tech_spec_id', techSpecId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching stage plot items:', error);
    } else {
      setItems(data as StagePlotItem[]);
    }
    setLoading(false);
  }, [techSpecId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (
    iconType: IconType,
    positionX: number,
    positionY: number,
    options?: {
      label?: string;
      channel_number?: number;
      mic_type?: string;
    }
  ) => {
    if (!techSpecId) return null;

    const { data, error } = await supabase
      .from('stage_plot_items')
      .insert({
        tech_spec_id: techSpecId,
        icon_type: iconType,
        position_x: positionX,
        position_y: positionY,
        provided_by: null,
        label: options?.label || null,
        channel_number: options?.channel_number || null,
        mic_type: options?.mic_type || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding stage plot item:', error);
      toast.error('Failed to add item');
      return null;
    }

    await fetchItems();
    return data as StagePlotItem;
  };

  const addDrumKit = async (centerX: number, centerY: number, startChannel: number) => {
    if (!techSpecId) return [];

    // Define drum kit mic positions relative to center
    const drumMics = [
      { label: 'Kick', offset: { x: 0, y: 15 }, micType: 'beta52', icon: 'mic_short' as IconType },
      { label: 'Snare Top', offset: { x: -8, y: 5 }, micType: 'sm57', icon: 'mic_short' as IconType },
      { label: 'Snare Bottom', offset: { x: -8, y: 8 }, micType: 'sm57', icon: 'mic_short' as IconType },
      { label: 'Hi-Hat', offset: { x: -15, y: 0 }, micType: 'condenser', icon: 'mic_short' as IconType },
      { label: 'Rack Tom 1', offset: { x: -5, y: -5 }, micType: 'e609', icon: 'mic_short' as IconType },
      { label: 'Rack Tom 2', offset: { x: 5, y: -5 }, micType: 'e609', icon: 'mic_short' as IconType },
      { label: 'Floor Tom', offset: { x: 12, y: 5 }, micType: 'e609', icon: 'mic_short' as IconType },
      { label: 'OH Left', offset: { x: -12, y: -12 }, micType: 'condenser', icon: 'mic_tall' as IconType },
      { label: 'OH Right', offset: { x: 12, y: -12 }, micType: 'condenser', icon: 'mic_tall' as IconType },
    ];

    const insertData = drumMics.map((mic, index) => ({
      tech_spec_id: techSpecId,
      icon_type: mic.icon,
      position_x: Math.max(5, Math.min(95, centerX + mic.offset.x)),
      position_y: Math.max(5, Math.min(95, centerY + mic.offset.y)),
      provided_by: null,
      label: mic.label,
      channel_number: startChannel + index,
      mic_type: mic.micType,
    }));

    // Also add the drum kit icon itself (no channel)
    insertData.unshift({
      tech_spec_id: techSpecId,
      icon_type: 'drums',
      position_x: centerX,
      position_y: centerY,
      provided_by: null,
      label: 'Drum Kit',
      channel_number: null,
      mic_type: null,
    });

    const { data, error } = await supabase
      .from('stage_plot_items')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Error adding drum kit:', error);
      toast.error('Failed to add drum kit');
      return [];
    }

    toast.success('Drum kit added with 9 mic channels');
    await fetchItems();
    return data as StagePlotItem[];
  };

  const updateItem = async (id: string, updates: Partial<StagePlotItem>) => {
    const { error } = await supabase
      .from('stage_plot_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating stage plot item:', error);
      return false;
    }

    await fetchItems();
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('stage_plot_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting stage plot item:', error);
      toast.error('Failed to delete item');
      return false;
    }

    await fetchItems();
    return true;
  };

  const pairItems = async (itemId: string, pairedWithId: string | null) => {
    return updateItem(itemId, { paired_with_id: pairedWithId });
  };

  return {
    items,
    loading,
    addItem,
    addDrumKit,
    updateItem,
    deleteItem,
    pairItems,
    refetch: fetchItems,
  };
}
