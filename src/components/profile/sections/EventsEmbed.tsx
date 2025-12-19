import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Edit2, Trash2, Check, X } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface EventsEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function EventsEmbed({ section, isEditing, onUpdate, onDelete }: EventsEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [embedType, setEmbedType] = useState(section.content?.embedType || 'songkick');
  const [embedUrl, setEmbedUrl] = useState(section.content?.embedUrl || '');
  const [embedCode, setEmbedCode] = useState(section.content?.embedCode || '');

  const handleSave = () => {
    onUpdate({ embedType, embedUrl, embedCode });
    setEditing(false);
  };

  const renderEmbed = () => {
    if (section.content?.embedCode) {
      // For custom embed codes (Bandsintown, Songkick widgets)
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: section.content.embedCode }}
          className="events-embed"
        />
      );
    }
    
    if (section.content?.embedUrl) {
      return (
        <iframe
          src={section.content.embedUrl}
          width="100%"
          height="400"
          frameBorder="0"
          loading="lazy"
          className="rounded-lg"
        />
      );
    }

    return null;
  };

  if (!section.content?.embedUrl && !section.content?.embedCode && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {section.title || 'Upcoming Events'}
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
            <div>
              <Label>Event Platform</Label>
              <Select value={embedType} onValueChange={setEmbedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="songkick">Songkick</SelectItem>
                  <SelectItem value="bandsintown">Bandsintown</SelectItem>
                  <SelectItem value="eventbrite">Eventbrite</SelectItem>
                  <SelectItem value="custom">Custom Embed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {embedType === 'custom' ? (
              <div>
                <Label>Embed Code</Label>
                <textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder="<script>...</script> or <iframe>...</iframe>"
                  className="w-full h-32 p-2 border rounded-md text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the embed code from your event platform
                </p>
              </div>
            ) : (
              <div>
                <Label>Embed URL or Widget ID</Label>
                <Input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {embedType === 'songkick' && 'Enter your Songkick artist page URL'}
                  {embedType === 'bandsintown' && 'Enter your Bandsintown widget URL'}
                  {embedType === 'eventbrite' && 'Enter your Eventbrite organizer page URL'}
                </p>
              </div>
            )}
            
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
          renderEmbed() || (
            <p className="text-muted-foreground text-center py-8">
              Click edit to add an events widget
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
