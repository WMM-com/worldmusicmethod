import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Image, FileText, Music, Video, File, Trash2, Loader2, 
  Upload, FolderPlus, ChevronRight, Folder, Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useR2Upload } from '@/hooks/useR2Upload';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useR2Upload();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Fetch media based on bucket type
  const { data: media, isLoading } = useQuery({
    queryKey: ['admin-media', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      
      // Filter by bucket type
      return (data as MediaItem[]).filter(item => {
        const bucket = item.metadata?.bucket || 'user';
        return bucket === activeTab;
      });
    },
  });

  // Get unique folders for the current view
  const folders = [...new Set(
    (media || [])
      .map(item => item.folder)
      .filter(Boolean)
      .map(folder => {
        // If we're in a folder, show subfolders
        if (currentFolder && folder?.startsWith(currentFolder + '/')) {
          const rest = folder.slice(currentFolder.length + 1);
          const nextPart = rest.split('/')[0];
          return currentFolder + '/' + nextPart;
        } else if (!currentFolder) {
          return folder?.split('/')[0];
        }
        return null;
      })
      .filter(Boolean)
  )] as string[];

  // Filter media for current folder view
  const filteredMedia = (media || []).filter(item => {
    if (!currentFolder) {
      // Root level - show items without folder or in root folders
      return !item.folder || !item.folder.includes('/');
    }
    // In a folder - show items in exactly this folder
    return item.folder === currentFolder || item.folder?.startsWith(currentFolder + '/');
  });

  // Get immediate folder contents
  const immediateMedia = filteredMedia.filter(item => {
    if (!currentFolder) {
      return !item.folder || item.folder.split('/').length === 1;
    }
    const depth = currentFolder.split('/').length;
    return item.folder?.split('/').length === depth + 1 || item.folder === currentFolder;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      const folder = currentFolder || 'uploads';
      const result = await uploadFile(file, {
        bucket: activeTab,
        folder,
        trackInDatabase: true,
      });

      if (result) {
        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded.`,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['admin-media'] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentFolder 
      ? `${currentFolder}/${newFolderName.trim()}`
      : newFolderName.trim();
    
    // Navigate to the new folder (it will be created when files are uploaded)
    setCurrentFolder(folderPath);
    setNewFolderDialogOpen(false);
    setNewFolderName('');
    
    toast({
      title: "Folder ready",
      description: `Upload files to create "${folderPath}"`,
    });
  };

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

  const navigateToFolder = (folder: string) => {
    setCurrentFolder(folder);
  };

  const breadcrumbs = currentFolder ? currentFolder.split('/') : [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Media Library</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewFolderDialogOpen(true)}
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bucket Toggle */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'admin' | 'user'); setCurrentFolder(''); }}>
            <TabsList>
              <TabsTrigger value="admin">Admin Media</TabsTrigger>
              <TabsTrigger value="user">User Media</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolder('')}
              className="h-7 px-2"
            >
              <Home className="h-4 w-4" />
            </Button>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolder(breadcrumbs.slice(0, index + 1).join('/'))}
                  className="h-7 px-2"
                >
                  {crumb}
                </Button>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (media?.length === 0 && folders.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No media files in {activeTab} storage
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Folders */}
              {folders
                .filter(folder => {
                  if (!currentFolder) return !folder.includes('/');
                  return folder.startsWith(currentFolder + '/') && folder.split('/').length === currentFolder.split('/').length + 1;
                })
                .map((folder) => (
                  <div
                    key={folder}
                    onClick={() => navigateToFolder(folder)}
                    className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <Folder className="h-12 w-12 text-primary" />
                    <span className="text-sm font-medium text-center px-2 truncate w-full">
                      {folder.split('/').pop()}
                    </span>
                  </div>
                ))}

              {/* Files */}
              {immediateMedia.map((file) => {
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

      {/* Delete Confirmation */}
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

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              {currentFolder && (
                <p className="text-sm text-muted-foreground">
                  Will be created in: {currentFolder}/
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
