import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music2, Edit2, Trash2, Check, X } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface SpotifyEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function SpotifyEmbed({ section, isEditing, onUpdate, onDelete }: SpotifyEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(section.content?.embedUrl || '');

  const getSpotifyEmbedUrl = (url: string) => {
    // Convert Spotify URL to embed URL
    // https://open.spotify.com/playlist/xxx -> https://open.spotify.com/embed/playlist/xxx
    // https://open.spotify.com/artist/xxx -> https://open.spotify.com/embed/artist/xxx
    if (url.includes('open.spotify.com') && !url.includes('/embed/')) {
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    return url;
  };

  const handleSave = () => {
    onUpdate({ embedUrl });
    setEditing(false);
  };

  const displayUrl = section.content?.embedUrl ? getSpotifyEmbedUrl(section.content.embedUrl) : '';

  if (!section.content?.embedUrl && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Music2 className="h-5 w-5 text-green-500" />
          {section.title || 'Spotify'}
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
          <div className="space-y-3">
            <div>
              <Label>Spotify URL</Label>
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a Spotify playlist, album, or artist URL
              </p>
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
        ) : displayUrl ? (
          <iframe
            src={displayUrl}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          />
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Click edit to add a Spotify embed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
