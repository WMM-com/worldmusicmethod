import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image, FileText, Music, Video, File, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MediaItem {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  mime_type: string | null;
  alt_text: string | null;
  folder: string | null;
  metadata: {
    bucket?: string;
    object_key?: string;
    original_name?: string;
  } | null;
  created_at: string;
}

export function AdminMedia() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const { data: media, isLoading } = useQuery({
    queryKey: ['admin-media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MediaItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaItem: MediaItem) => {
      // First, try to delete from R2
      const objectKey = mediaItem.metadata?.object_key;
      const bucket = (mediaItem.metadata?.bucket as "admin" | "user") || "user";

      if (objectKey) {
        console.log(`Deleting from R2: ${objectKey} in bucket ${bucket}`);
        
        const { data, error: r2Error } = await supabase.functions.invoke("r2-delete", {
          body: { objectKey, bucket },
        });

        if (r2Error) {
          console.error("R2 deletion failed:", r2Error);
          // Log but continue with database deletion
          toast({
            title: "Warning",
            description: "File may not have been removed from storage. Database record will be deleted.",
            variant: "destructive",
          });
        } else if (!data?.success) {
          console.error("R2 deletion returned failure:", data);
        } else {
          console.log("R2 deletion successful");
        }
      }

      // Always delete the database record
      const { error: dbError } = await supabase
        .from('media_library')
        .delete()
        .eq('id', mediaItem.id);

      if (dbError) {
        throw new Error(`Failed to delete database record: ${dbError.message}`);
      }

      return mediaItem;
    },
    onSuccess: (mediaItem) => {
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      toast({
        title: "Media deleted",
        description: `${mediaItem.file_name} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setSelectedMedia(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete media",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image')) return Image;
    if (fileType.startsWith('video')) return Video;
    if (fileType.startsWith('audio')) return Music;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteClick = (item: MediaItem) => {
    setSelectedMedia(item);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Media Library</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : media?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No media files yet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {media?.map((file) => {
                const Icon = getFileIcon(file.file_type);
                const isImage = file.file_type.startsWith('image');
                
                return (
                  <div
                    key={file.id}
                    className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors"
                  >
                    {isImage ? (
                      <img
                        src={file.file_url}
                        alt={file.alt_text || file.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteClick(file)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending && selectedMedia?.id === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div>
                        <p className="text-xs font-medium truncate">{file.file_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {file.folder || 'uploads'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMedia?.file_name}"? 
              This will permanently remove the file from storage and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMedia && deleteMutation.mutate(selectedMedia)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
