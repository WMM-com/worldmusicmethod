import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Headphones, Edit2, Trash2, Check, X } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface SoundCloudEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function SoundCloudEmbed({ section, isEditing, onUpdate, onDelete }: SoundCloudEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(section.content?.embedUrl || '');

  const getSoundCloudEmbedUrl = (url: string) => {
    // If it's already an embed URL, return as is
    if (url.includes('w.soundcloud.com/player')) {
      return url;
    }
    // Convert regular SoundCloud URL to embed widget URL
    // https://soundcloud.com/artist/track -> widget embed
    if (url.includes('soundcloud.com') && !url.includes('api.soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
    }
    return url;
  };

  const handleSave = () => {
    onUpdate({ embedUrl });
    setEditing(false);
  };

  const displayUrl = section.content?.embedUrl ? getSoundCloudEmbedUrl(section.content.embedUrl) : '';

  if (!section.content?.embedUrl && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Headphones className="h-5 w-5 text-orange-500" />
          {section.title || 'SoundCloud'}
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
              <Label>SoundCloud URL</Label>
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://soundcloud.com/artist/track"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a SoundCloud track, playlist, or artist URL
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
            height="166"
            frameBorder="0"
            allow="autoplay"
            loading="lazy"
            className="rounded-lg"
          />
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Click edit to add a SoundCloud embed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
