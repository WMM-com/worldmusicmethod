import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { useR2Upload } from '@/hooks/useR2Upload';
import { 
  Headphones, Settings, Trash2, Upload, Play, Pause, X, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface AudioBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  userId: string;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

interface AudioTrack {
  id: string;
  title: string;
  url: string;
}

export function AudioBlock({ section, isEditing, userId, onUpdate, onDelete }: AudioBlockProps) {
  const { uploadFile, isUploading, progress } = useR2Upload();
  
  const content = section.content as {
    title?: string;
    tracks?: AudioTrack[];
  };

  const [localContent, setLocalContent] = useState({
    title: content.title || 'Audio',
    tracks: content.tracks || [],
  });

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'audio',
      trackInDatabase: true,
    });

    if (result) {
      const newTrack: AudioTrack = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: result.url,
      };
      
      setLocalContent(prev => ({
        ...prev,
        tracks: [...prev.tracks, newTrack],
      }));
      
      toast.success('Audio uploaded');
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    setLocalContent(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== trackId),
    }));
  };

  const handlePlay = (track: AudioTrack) => {
    if (playingId === track.id) {
      // Pause
      const audio = audioElements.get(track.id);
      if (audio) {
        audio.pause();
      }
      setPlayingId(null);
    } else {
      // Stop any currently playing
      audioElements.forEach(audio => audio.pause());
      
      // Play new
      let audio = audioElements.get(track.id);
      if (!audio) {
        audio = new Audio(track.url);
        audio.onended = () => setPlayingId(null);
        setAudioElements(prev => new Map(prev).set(track.id, audio!));
      }
      audio.play();
      setPlayingId(track.id);
    }
  };

  const handleSave = () => {
    onUpdate(localContent);
    toast.success('Audio block saved');
  };

  if (!isEditing) {
    // View mode
    if (localContent.tracks.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            {localContent.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {localContent.tracks.map((track) => (
              <div 
                key={track.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handlePlay(track)}
                >
                  {playingId === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
                <span className="font-medium flex-1 truncate">{track.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="relative">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Headphones className="h-4 w-4" />
          Audio Player
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Section Title</Label>
          <Input
            value={localContent.title}
            onChange={(e) => setLocalContent(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Audio"
          />
        </div>

        {/* Track List */}
        {localContent.tracks.length > 0 && (
          <div className="space-y-2">
            <Label>Tracks</Label>
            {localContent.tracks.map((track) => (
              <div 
                key={track.id}
                className="flex items-center gap-2 p-2 rounded border"
              >
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={track.title}
                  onChange={(e) => {
                    setLocalContent(prev => ({
                      ...prev,
                      tracks: prev.tracks.map(t => 
                        t.id === track.id ? { ...t, title: e.target.value } : t
                      ),
                    }));
                  }}
                  className="flex-1 h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveTrack(track.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            id={`audio-upload-${section.id}`}
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label 
            htmlFor={`audio-upload-${section.id}`} 
            className="cursor-pointer"
          >
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <Progress value={progress} className="w-32 mx-auto" />
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Upload audio file</p>
              </>
            )}
          </label>
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
