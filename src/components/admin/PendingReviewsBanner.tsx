import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PendingReviewsBannerProps {
  onNavigate: () => void;
}

export function PendingReviewsBanner({ onNavigate }: PendingReviewsBannerProps) {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const fetchCount = async () => {
    const { count: c } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setCount(c || 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel('pending-reviews-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (dismissed || count === 0) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <span className="font-medium">
          You have <strong>{count}</strong> review{count !== 1 ? 's' : ''} waiting for approval
        </span>
        <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={onNavigate}>
          Review now →
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDismissed(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
