import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Upload, Loader2 } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { usePinAudio } from '@/hooks/usePinnedAudio';
import { toast } from 'sonner';

interface PinAudioDialogProps {
  groupId: string;
  section?: string;
}

export function PinAudioDialog({ groupId, section = 'group_header' }: PinAudioDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, isUploading, progress } = useR2Upload();
  const pinAudio = usePinAudio();
  
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }
    
    const result = await uploadFile(file, {
      bucket: 'user',
      folder: `groups/${groupId}/audio`,
      trackInDatabase: true,
    });
    
    if (result?.url) {
      setAudioUrl(result.url);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    const result = await uploadFile(file, {
      bucket: 'user',
      folder: `groups/${groupId}/covers`,
      imageOptimization: 'avatar',
      trackInDatabase: false,
    });
    
    if (result?.url) {
      setCoverUrl(result.url);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !audioUrl) {
      toast.error('Title and audio file are required');
      return;
    }
    
    await pinAudio.mutateAsync({
      group_id: groupId,
      title: title.trim(),
      artist: artist.trim() || undefined,
      audio_url: audioUrl,
      cover_image_url: coverUrl || undefined,
      section,
    });
    
    setOpen(false);
    setTitle('');
    setArtist('');
    setAudioUrl('');
    setCoverUrl('');
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Music className="h-4 w-4 mr-2" />
          Pin Audio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pin Audio to Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Audio File *</Label>
            {audioUrl ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                <Music className="h-5 w-5 text-primary" />
                <span className="text-sm flex-1 truncate">{title || 'Audio uploaded'}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => audioInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Audio
                  </>
                )}
              </Button>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="artist">Artist</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Cover Image (optional)</Label>
            {coverUrl ? (
              <div className="flex items-center gap-2">
                <img src={coverUrl} alt="" className="h-12 w-12 rounded object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Cover
              </Button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!audioUrl || !title.trim() || pinAudio.isPending}>
              {pinAudio.isPending ? 'Pinning...' : 'Pin Audio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
