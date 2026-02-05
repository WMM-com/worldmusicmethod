import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Code, Edit2, Trash2, Check, X } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface GenericEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function GenericEmbed({ section, isEditing, onUpdate, onDelete }: GenericEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(section.content?.embedUrl || '');
  const [embedTitle, setEmbedTitle] = useState(section.content?.embedTitle || '');
  const [embedHeight, setEmbedHeight] = useState(section.content?.embedHeight || 400);

  const handleSave = () => {
    onUpdate({ embedUrl, embedTitle, embedHeight });
    setEditing(false);
  };

  if (!section.content?.embedUrl && !isEditing) {
    return null;
  }

  return (
    <Card className="bg-black text-white border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Code className="h-5 w-5 text-primary" />
          {section.content?.embedTitle || section.title || 'Embed'}
        </CardTitle>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-white hover:bg-zinc-800">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-white hover:bg-zinc-800">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label>Title (displayed as header)</Label>
              <Input
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                placeholder="e.g., My Bandcamp, Linktree, etc."
              />
            </div>
            <div>
              <Label>Embed URL</Label>
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste any embeddable URL (Bandcamp, Linktree, etc.)
              </p>
            </div>
            <div>
              <Label>Height (px)</Label>
              <Input
                type="number"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(Number(e.target.value))}
                placeholder="400"
                min={100}
                max={1000}
              />
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
        ) : section.content?.embedUrl ? (
          <iframe
            src={section.content.embedUrl}
            width="100%"
            height={section.content.embedHeight || 400}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            loading="lazy"
            className="rounded-lg"
          />
        ) : (
          <p className="text-zinc-400 text-center py-8">
            Click edit to add an embed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
