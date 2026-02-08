import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import type { BlogPostRow } from './types';

interface BlogTrashBinProps {
  trashedPosts: BlogPostRow[];
}

export function BlogTrashBin({ trashedPosts }: BlogTrashBinProps) {
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      setActionId(id);
      const { error } = await supabase
        .from('blog_posts')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Post restored');
      setActionId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setActionId(null);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setActionId(id);
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Post permanently deleted');
      setActionId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setActionId(null);
    },
  });

  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .not('deleted_at', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Bin emptied');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (trashedPosts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Bin is empty</h3>
          <p className="text-muted-foreground text-sm">
            Deleted blog posts will appear here for 15 days before being permanently removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {trashedPosts.length} post{trashedPosts.length !== 1 ? 's' : ''} in bin
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash className="h-4 w-4 mr-2" />
              Empty Bin
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Empty Bin?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {trashedPosts.length} posts in the bin. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => emptyBinMutation.mutate()}
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {trashedPosts.map((post) => {
        const deletedAt = post.deleted_at ? new Date(post.deleted_at) : new Date();
        const expiresAt = new Date(deletedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        return (
          <Card key={post.id} className="border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deleted {formatDistanceToNow(deletedAt, { addSuffix: true })}
                  </p>
                  <Badge variant="outline" className="mt-1.5 text-xs">
                    Auto-deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(post.id)}
                    disabled={actionId === post.id}
                    title="Restore"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Restore
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionId === post.id}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete "{post.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. The post will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => permanentDeleteMutation.mutate(post.id)}
                        >
                          Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
