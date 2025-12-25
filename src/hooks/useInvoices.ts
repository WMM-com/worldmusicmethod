import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, PaymentStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useInvoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active invoices (not deleted)
  const invoicesQuery = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]).map(inv => ({
        ...inv,
        items: inv.items as InvoiceItem[],
      })) as Invoice[];
    },
    enabled: !!user,
  });

  // Deleted invoices (bin)
  const deletedInvoicesQuery = useQuery({
    queryKey: ['invoices-deleted', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return (data as any[]).map(inv => ({
        ...inv,
        items: inv.items as InvoiceItem[],
      })) as Invoice[];
    },
    enabled: !!user,
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          user_id: user.id,
          items: invoice.items as any,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        items: data.items as unknown as InvoiceItem[],
      } as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.items) {
        updateData.items = updates.items as any;
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        items: data.items as unknown as InvoiceItem[],
      } as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-deleted'] });
      toast.success('Invoice deleted permanently');
    },
    onError: (error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    },
  });

  // Soft delete (move to bin)
  const softDeleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-deleted'] });
      toast.success('Invoice moved to bin');
    },
    onError: (error) => {
      toast.error('Failed to move invoice to bin: ' + error.message);
    },
  });

  // Restore from bin
  const restoreInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-deleted'] });
      toast.success('Invoice restored');
    },
    onError: (error) => {
      toast.error('Failed to restore invoice: ' + error.message);
    },
  });

  return {
    invoices: invoicesQuery.data ?? [],
    deletedInvoices: deletedInvoicesQuery.data ?? [],
    isLoading: invoicesQuery.isLoading,
    isLoadingDeleted: deletedInvoicesQuery.isLoading,
    error: invoicesQuery.error,
    refetch: invoicesQuery.refetch,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    softDeleteInvoice,
    restoreInvoice,
  };
}

export function useGenerateInvoiceNumber() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice-number', user?.id],
    queryFn: async () => {
      if (!user) return 'INV-0001';

      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return `INV-${new Date().getFullYear()}-0001`;
      }

      const lastNumber = data[0].invoice_number;
      const parts = lastNumber.split('-');
      const num = parseInt(parts[parts.length - 1]) + 1;
      return `INV-${new Date().getFullYear()}-${num.toString().padStart(4, '0')}`;
    },
    enabled: !!user,
  });
}

export function useEventInvoices() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['event-invoices', user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('invoices')
        .select('id, event_id, sent_at, invoice_number')
        .eq('user_id', user.id)
        .not('event_id', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;

      // Create a map of event_id -> invoice info
      const invoiceMap: Record<string, { id: string; sent_at: string | null; invoice_number: string }> = {};
      data.forEach(inv => {
        if (inv.event_id) {
          invoiceMap[inv.event_id] = {
            id: inv.id,
            sent_at: inv.sent_at,
            invoice_number: inv.invoice_number,
          };
        }
      });
      return invoiceMap;
    },
    enabled: !!user,
  });

  return {
    eventInvoices: query.data || {},
    isLoading: query.isLoading,
  };
}
