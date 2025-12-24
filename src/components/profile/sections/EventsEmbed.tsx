import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Edit2, Trash2, Check, X, ExternalLink, MapPin, Clock } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface EventItem {
  title: string;
  date: string;
  time?: string;
  venue?: string;
  link?: string;
}

interface EventsEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function EventsEmbed({ section, isEditing, onUpdate, onDelete }: EventsEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [embedType, setEmbedType] = useState(section.content?.embedType || 'manual');
  const [embedUrl, setEmbedUrl] = useState(section.content?.embedUrl || '');
  const [embedCode, setEmbedCode] = useState(section.content?.embedCode || '');
  const [events, setEvents] = useState<EventItem[]>(section.content?.events || []);
  const [newEvent, setNewEvent] = useState<EventItem>({ title: '', date: '', time: '', venue: '', link: '' });

  const handleSave = () => {
    onUpdate({ embedType, embedUrl, embedCode, events });
    setEditing(false);
  };

  const handleAddEvent = () => {
    if (newEvent.title && newEvent.date) {
      setEvents([...events, newEvent]);
      setNewEvent({ title: '', date: '', time: '', venue: '', link: '' });
    }
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const sanitizeEmbedCode = (code: string): string => {
    return DOMPurify.sanitize(code, {
      ALLOWED_TAGS: ['iframe', 'blockquote', 'a', 'div', 'span', 'p', 'img'],
      ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'class', 'style', 'href', 'target', 'rel', 'alt', 'data-widget-id', 'data-artist', 'allowfullscreen', 'loading'],
      ALLOW_DATA_ATTR: true,
    });
  };

  const renderEmbed = () => {
    // Manual events list
    if (embedType === 'manual' && events.length > 0) {
      return (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span>{new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</span>
                    {event.time && (
                      <>
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{event.time}</span>
                      </>
                    )}
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                </div>
                {event.link && (
                  <a 
                    href={event.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-7 px-2">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section.content?.embedCode) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: sanitizeEmbedCode(section.content.embedCode) }}
          className="events-embed"
        />
      );
    }
    
    if (section.content?.embedUrl) {
      return (
        <iframe
          src={section.content.embedUrl}
          width="100%"
          height="300"
          frameBorder="0"
          loading="lazy"
          className="rounded-lg"
        />
      );
    }

    return null;
  };

  const hasContent = (embedType === 'manual' && events.length > 0) || 
                     section.content?.embedUrl || 
                     section.content?.embedCode;

  if (!hasContent && !isEditing) {
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
              <Label>Event Source</Label>
              <Select value={embedType} onValueChange={setEmbedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Events List</SelectItem>
                  <SelectItem value="songkick">Songkick Widget</SelectItem>
                  <SelectItem value="bandsintown">Bandsintown Widget</SelectItem>
                  <SelectItem value="custom">Custom Embed Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {embedType === 'manual' ? (
              <div className="space-y-4">
                {/* Existing events */}
                {events.length > 0 && (
                  <div className="space-y-2">
                    <Label>Your Events</Label>
                    {events.map((event, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm truncate">{event.title} - {event.date}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveEvent(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add new event form */}
                <div className="space-y-3 p-3 border rounded-lg">
                  <Label className="text-xs font-medium">Add Event</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                    <Input
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      placeholder="Time (e.g. 8:00 PM)"
                    />
                  </div>
                  <Input
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                    placeholder="Venue / Location"
                  />
                  <Input
                    value={newEvent.link}
                    onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                    placeholder="Ticket link (optional)"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddEvent} className="w-full">
                    Add Event
                  </Button>
                </div>
              </div>
            ) : embedType === 'custom' ? (
              <div>
                <Label>Embed Code</Label>
                <Textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder="<script>...</script> or <iframe>...</iframe>"
                  className="h-32 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the embed code from your event platform
                </p>
              </div>
            ) : (
              <div>
                <Label>Widget URL or Artist ID</Label>
                <Input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {embedType === 'songkick' && 'Enter your Songkick widget URL'}
                  {embedType === 'bandsintown' && 'Enter your Bandsintown widget URL'}
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
              Click edit to add events
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
