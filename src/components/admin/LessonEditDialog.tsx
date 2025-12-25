import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Music, Youtube, FileText, Paperclip, Guitar } from 'lucide-react';
import { toast } from 'sonner';

interface FileAttachment {
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'audio' | 'other';
}

interface ListeningReference {
  title: string;
  artist: string;
  url?: string;
  platform?: 'spotify' | 'youtube' | 'soundcloud';
}

interface LessonEditDialogProps {
  lesson: {
    id: string;
    title: string;
    lesson_type: string;
    video_url: string | null;
    content: string | null;
    duration_seconds: number | null;
    order_index: number;
    youtube_urls?: string[];
    spotify_urls?: string[];
    file_attachments?: FileAttachment[];
    listening_references?: ListeningReference[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonEditDialog({ lesson, open, onOpenChange }: LessonEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(lesson.title);
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [content, setContent] = useState(lesson.content || '');
  const [duration, setDuration] = useState(lesson.duration_seconds?.toString() || '');
  const [orderIndex, setOrderIndex] = useState(lesson.order_index.toString());
  
  // Rich content fields
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(lesson.youtube_urls || []);
  const [spotifyUrls, setSpotifyUrls] = useState<string[]>(lesson.spotify_urls || []);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>(lesson.file_attachments || []);
  const [listeningRefs, setListeningRefs] = useState<ListeningReference[]>(lesson.listening_references || []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('module_lessons')
        .update({
          title,
          lesson_type: lessonType,
          video_url: videoUrl || null,
          content: content || null,
          duration_seconds: duration ? parseInt(duration) : null,
          order_index: parseInt(orderIndex),
          youtube_urls: youtubeUrls.filter(u => u.trim()),
          spotify_urls: spotifyUrls.filter(u => u.trim()),
          file_attachments: fileAttachments.filter(f => f.name.trim() && f.url.trim()) as unknown as any,
          listening_references: listeningRefs.filter(r => r.title.trim()) as unknown as any,
        })
        .eq('id', lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules'] });
      toast.success('Lesson updated');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lesson');
    },
  });

  // YouTube helpers
  const addYoutubeUrl = () => setYoutubeUrls([...youtubeUrls, '']);
  const removeYoutubeUrl = (idx: number) => setYoutubeUrls(youtubeUrls.filter((_, i) => i !== idx));
  const updateYoutubeUrl = (idx: number, value: string) => {
    const updated = [...youtubeUrls];
    updated[idx] = value;
    setYoutubeUrls(updated);
  };

  // Spotify helpers
  const addSpotifyUrl = () => setSpotifyUrls([...spotifyUrls, '']);
  const removeSpotifyUrl = (idx: number) => setSpotifyUrls(spotifyUrls.filter((_, i) => i !== idx));
  const updateSpotifyUrl = (idx: number, value: string) => {
    const updated = [...spotifyUrls];
    updated[idx] = value;
    setSpotifyUrls(updated);
  };

  // File attachment helpers
  const addFileAttachment = () => setFileAttachments([...fileAttachments, { name: '', url: '', type: 'pdf' }]);
  const removeFileAttachment = (idx: number) => setFileAttachments(fileAttachments.filter((_, i) => i !== idx));
  const updateFileAttachment = (idx: number, field: keyof FileAttachment, value: string) => {
    const updated = [...fileAttachments];
    updated[idx] = { ...updated[idx], [field]: value };
    setFileAttachments(updated);
  };

  // Listening reference helpers
  const addListeningRef = () => setListeningRefs([...listeningRefs, { title: '', artist: '', url: '', platform: 'spotify' }]);
  const removeListeningRef = (idx: number) => setListeningRefs(listeningRefs.filter((_, i) => i !== idx));
  const updateListeningRef = (idx: number, field: keyof ListeningReference, value: string) => {
    const updated = [...listeningRefs];
    updated[idx] = { ...updated[idx], [field]: value };
    setListeningRefs(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson: {lesson.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="basic" className="text-xs"><FileText className="h-3 w-3 mr-1" />Basic</TabsTrigger>
              <TabsTrigger value="content" className="text-xs"><Guitar className="h-3 w-3 mr-1" />Content</TabsTrigger>
              <TabsTrigger value="media" className="text-xs"><Youtube className="h-3 w-3 mr-1" />Media</TabsTrigger>
              <TabsTrigger value="files" className="text-xs"><Paperclip className="h-3 w-3 mr-1" />Files</TabsTrigger>
              <TabsTrigger value="listening" className="text-xs"><Music className="h-3 w-3 mr-1" />Listening</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="les-title">Title</Label>
                <Input id="les-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="les-type">Lesson Type</Label>
                  <Select value={lessonType} onValueChange={setLessonType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="listening">Listening</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="les-order">Order</Label>
                  <Input id="les-order" type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="les-video">Soundslice ID</Label>
                  <Input id="les-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="e.g. lrXCc" />
                  <p className="text-xs text-muted-foreground">Just the ID, not the full URL</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="les-duration">Duration (seconds)</Label>
                  <Input id="les-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="les-content">Lesson Content</Label>
                <p className="text-xs text-muted-foreground">Main text content, instructions, or notes for this lesson. HTML is supported.</p>
                <Textarea 
                  id="les-content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  rows={12} 
                  className="font-mono text-xs"
                  placeholder="Enter lesson content, instructions, or notes..."
                />
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500" /> YouTube Videos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addYoutubeUrl}>
                    <Plus className="h-3 w-3 mr-1" /> Add Video
                  </Button>
                </div>
                {youtubeUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No YouTube videos yet.</p>
                )}
                {youtubeUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateYoutubeUrl(idx, e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeYoutubeUrl(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Music className="h-4 w-4 text-green-500" /> Spotify Tracks/Playlists</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpotifyUrl}>
                    <Plus className="h-3 w-3 mr-1" /> Add Spotify
                  </Button>
                </div>
                {spotifyUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No Spotify embeds yet.</p>
                )}
                {spotifyUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateSpotifyUrl(idx, e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSpotifyUrl(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>File Attachments</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFileAttachment}>
                  <Plus className="h-3 w-3 mr-1" /> Add File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Add downloadable files like PDFs, images, or audio files.</p>
              {fileAttachments.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No file attachments yet.</p>
              )}
              {fileAttachments.map((file, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={file.name}
                      onChange={(e) => updateFileAttachment(idx, 'name', e.target.value)}
                      placeholder="File name (e.g. Practice Sheet)"
                    />
                    <Select 
                      value={file.type} 
                      onValueChange={(v) => updateFileAttachment(idx, 'type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={file.url}
                      onChange={(e) => updateFileAttachment(idx, 'url', e.target.value)}
                      placeholder="https://... (file URL)"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFileAttachment(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="listening" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Listening References</Label>
                <Button type="button" variant="outline" size="sm" onClick={addListeningRef}>
                  <Plus className="h-3 w-3 mr-1" /> Add Reference
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Recommended tracks for this lesson.</p>
              {listeningRefs.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No listening references yet.</p>
              )}
              {listeningRefs.map((ref, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={ref.title}
                      onChange={(e) => updateListeningRef(idx, 'title', e.target.value)}
                      placeholder="Track title"
                    />
                    <Input
                      value={ref.artist}
                      onChange={(e) => updateListeningRef(idx, 'artist', e.target.value)}
                      placeholder="Artist name"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={ref.url || ''}
                      onChange={(e) => updateListeningRef(idx, 'url', e.target.value)}
                      placeholder="URL (optional)"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeListeningRef(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Lesson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
