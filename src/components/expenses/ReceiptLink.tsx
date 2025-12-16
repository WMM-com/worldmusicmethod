import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReceiptLinkProps {
  filePath: string;
}

export function ReceiptLink({ filePath }: ReceiptLinkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if it's already a full URL (legacy data)
      if (filePath.startsWith('http')) {
        window.open(filePath, '_blank');
        return;
      }

      // Get a signed URL for the file
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error || !data?.signedUrl) {
        console.error('Failed to get signed URL:', error);
        return;
      }

      window.open(data.signedUrl, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex items-center gap-1 text-primary hover:underline text-sm disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ExternalLink className="h-3 w-3" />
      )}
      View
    </button>
  );
}
