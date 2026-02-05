import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, Code2, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ShortcodeBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
  userId?: string;
  profileSlug?: string;
}

const SHORTCODE_TYPES = [
  { value: 'profile_link', label: 'Profile Link', description: 'Link to this profile' },
  { value: 'social_links', label: 'Social Links', description: 'Display social media icons' },
  { value: 'latest_tracks', label: 'Latest Tracks', description: 'Show recent music uploads' },
  { value: 'upcoming_events', label: 'Upcoming Events', description: 'List upcoming events' },
  { value: 'contact_form', label: 'Contact Form', description: 'Embedded contact form' },
  { value: 'newsletter_signup', label: 'Newsletter Signup', description: 'Email subscription form' },
  { value: 'custom', label: 'Custom Shortcode', description: 'Define your own shortcode' }
];

export function ShortcodeBlock({ section, isEditing, onUpdate, userId, profileSlug }: ShortcodeBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const shortcodeType = content.shortcodeType || 'profile_link';
  const customCode = content.customCode || '';
  const params = content.params || {};

  const [editState, setEditState] = useState({
    shortcodeType,
    customCode,
    params
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const generateShortcode = () => {
    const type = editState.shortcodeType;
    if (type === 'custom') {
      return editState.customCode || '[custom]';
    }
    
    const paramStr = Object.entries(editState.params)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    
    return `[${type}${paramStr ? ' ' + paramStr : ''}]`;
  };

  const copyShortcode = () => {
    navigator.clipboard.writeText(generateShortcode());
    toast.success('Shortcode copied to clipboard');
  };

  const renderShortcodePreview = () => {
    switch (shortcodeType) {
      case 'profile_link':
        return (
          <a href={`/u/${profileSlug || 'username'}`} className="text-primary hover:underline">
            View Profile →
          </a>
        );
      case 'social_links':
        return (
          <div className="flex gap-3 justify-center">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs">IG</span>
            </div>
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs">YT</span>
            </div>
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs">SP</span>
            </div>
          </div>
        );
      case 'latest_tracks':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-muted rounded">
              <div className="w-8 h-8 bg-primary/20 rounded" />
              <span className="text-sm">Latest Track 1</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-muted rounded">
              <div className="w-8 h-8 bg-primary/20 rounded" />
              <span className="text-sm">Latest Track 2</span>
            </div>
          </div>
        );
      case 'upcoming_events':
        return (
          <div className="text-center text-muted-foreground text-sm">
            <p>📅 No upcoming events</p>
          </div>
        );
      case 'contact_form':
        return (
          <div className="space-y-2 max-w-xs mx-auto">
            <Input placeholder="Your email" disabled />
            <Input placeholder="Message" disabled />
            <Button className="w-full" disabled>Send</Button>
          </div>
        );
      case 'newsletter_signup':
        return (
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input placeholder="Enter your email" disabled className="flex-1" />
            <Button disabled>Subscribe</Button>
          </div>
        );
      default:
        return (
          <div className="text-center text-muted-foreground">
            <Code2 className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-mono">{generateShortcode()}</p>
          </div>
        );
    }
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Edit Shortcode
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Shortcodes are dynamic placeholders that display live content from your profile.
            </p>
          </div>

          <div>
            <Label>Shortcode Type</Label>
            <Select 
              value={editState.shortcodeType} 
              onValueChange={(v) => setEditState(s => ({ ...s, shortcodeType: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHORTCODE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">- {type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editState.shortcodeType === 'custom' && (
            <div>
              <Label>Custom Shortcode</Label>
              <Input
                value={editState.customCode}
                onChange={(e) => setEditState(s => ({ ...s, customCode: e.target.value }))}
                placeholder="[your_shortcode param='value']"
                className="font-mono"
              />
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm font-mono">{generateShortcode()}</code>
            <Button size="sm" variant="ghost" onClick={copyShortcode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group relative py-4">
      {isEditing && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute -top-2 -right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={() => setInlineEdit(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {renderShortcodePreview()}
    </div>
  );
}
