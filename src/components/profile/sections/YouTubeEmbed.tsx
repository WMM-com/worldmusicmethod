import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Edit2, Trash2, Check, X, Plus } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface YouTubeEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
  isSidebar?: boolean;
}

export function YouTubeEmbed({ section, isEditing, onUpdate, onDelete, isSidebar = false }: YouTubeEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [videos, setVideos] = useState<string[]>(section.content?.videos || []);
  const [newUrl, setNewUrl] = useState('');

  const getYouTubeEmbedUrl = (url: string) => {
    // Already an embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    // If no match but looks like a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return `https://www.youtube.com/embed/${url.trim()}`;
    }
    return url;
  };

  const handleAddVideo = () => {
    if (newUrl) {
      setVideos([...videos, newUrl]);
      setNewUrl('');
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate({ videos });
    setEditing(false);
  };

  if (!section.content?.videos?.length && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          {section.title || 'Videos'}
        </CardTitle>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {videos.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={url} readOnly className="flex-1" />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleRemoveVideo(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddVideo}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={isSidebar ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
            {section.content?.videos?.map((url: string, index: number) => (
              <div key={index} className="aspect-video">
                <iframe
                  src={getYouTubeEmbedUrl(url)}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="rounded-lg"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
