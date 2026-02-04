import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  document_category: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_CATEGORIES = [
  { value: 'id', label: 'ID Documents', description: 'Passport, driving license, work permits' },
  { value: 'insurance', label: 'Insurance', description: 'Public liability, equipment insurance' },
  { value: 'setlist', label: 'Setlists', description: 'Performance setlists and running orders' },
  { value: 'rider', label: 'Riders', description: 'Technical and hospitality riders' },
  { value: 'prs', label: 'PRS Forms', description: 'Performance rights forms' },
  { value: 'contract', label: 'Contracts', description: 'Performance contracts and agreements' },
  { value: 'other', label: 'Other', description: 'Any other important documents' },
];

export function useUserDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } else {
      setDocuments(data as UserDocument[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = async (
    title: string,
    fileUrl: string,
    fileName: string,
    fileType?: string,
    fileSize?: number,
    description?: string,
    category?: string
  ): Promise<UserDocument | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_documents')
      .insert({
        user_id: user.id,
        title: title.trim(),
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType || null,
        file_size: fileSize || null,
        description: description?.trim() || null,
        document_category: category || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to save document');
      return null;
    }

    toast.success('Document saved successfully');
    setDocuments(prev => [...prev, data as UserDocument].sort((a, b) => a.title.localeCompare(b.title)));
    return data as UserDocument;
  };

  const updateDocument = async (id: string, updates: Partial<UserDocument>): Promise<boolean> => {
    const { error } = await supabase
      .from('user_documents')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
      return false;
    }

    toast.success('Document updated');
    setDocuments(prev => 
      prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
        .sort((a, b) => a.title.localeCompare(b.title))
    );
    return true;
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    const doc = documents.find(d => d.id === id);
    
    const { error } = await supabase
      .from('user_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    }

    // Also try to delete from storage if it's in our bucket
    if (doc?.file_url) {
      try {
        // Handle both public URL format and direct path format
        let path = '';
        if (doc.file_url.includes('/user-documents/')) {
          path = doc.file_url.split('/user-documents/')[1];
        } else if (doc.file_url.includes('user-documents')) {
          path = doc.file_url.split('user-documents/')[1];
        }
        if (path) {
          // Remove query params if present (from signed URLs)
          path = path.split('?')[0];
          await supabase.storage.from('user-documents').remove([path]);
        }
      } catch (e) {
        console.error('Could not delete file from storage:', e);
      }
    }

    toast.success('Document deleted');
    setDocuments(prev => prev.filter(d => d.id !== id));
    return true;
  };

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}
