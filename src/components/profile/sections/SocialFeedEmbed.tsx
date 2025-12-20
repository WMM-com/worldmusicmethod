import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Edit2, Trash2, Check, X, Facebook, Instagram } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface SocialFeedEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function SocialFeedEmbed({ section, isEditing, onUpdate, onDelete }: SocialFeedEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [platform, setPlatform] = useState(section.content?.platform || 'instagram');
  const [embedCode, setEmbedCode] = useState(section.content?.embedCode || '');

  const sanitizeEmbedCode = (code: string): string => {
    return DOMPurify.sanitize(code, {
      ALLOWED_TAGS: ['iframe', 'blockquote', 'a', 'div', 'span', 'p', 'img', 'time'],
      ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'class', 'style', 'href', 'target', 'rel', 'alt', 'data-instgrm-captioned', 'data-instgrm-permalink', 'data-instgrm-version', 'cite', 'datetime', 'allowfullscreen', 'loading'],
      ALLOW_DATA_ATTR: true,
    });
  };

  const handleSave = () => {
    onUpdate({ platform, embedCode });
    setEditing(false);
  };

  if (!section.content?.embedCode && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {section.title || 'Social Feed'}
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
            <Tabs value={platform} onValueChange={setPlatform}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="instagram">
                  <Instagram className="h-4 w-4 mr-1" /> Instagram
                </TabsTrigger>
                <TabsTrigger value="facebook">
                  <Facebook className="h-4 w-4 mr-1" /> Facebook
                </TabsTrigger>
                <TabsTrigger value="tiktok">
                  TikTok
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <Label>Embed Code</Label>
              <textarea
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                placeholder="Paste embed code from the platform..."
                className="w-full h-32 p-2 border rounded-md text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {platform === 'instagram' && (
                  <>Go to your Instagram post → ⋯ → Embed → Copy embed code</>
                )}
                {platform === 'facebook' && (
                  <>Go to your Facebook post → ⋯ → Embed → Copy code</>
                )}
                {platform === 'tiktok' && (
                  <>Go to your TikTok video → Share → Embed → Copy code</>
                )}
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
        ) : section.content?.embedCode ? (
          <div 
            dangerouslySetInnerHTML={{ __html: sanitizeEmbedCode(section.content.embedCode) }}
            className="social-embed flex justify-center"
          />
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Click edit to add a social media feed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
