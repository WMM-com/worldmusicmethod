import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  Type, EllipsisVertical, Trash2, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TextBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

type TextAlign = 'left' | 'center' | 'right';
type HeadingLevel = 'h1' | 'h2' | 'p';

export function TextBlock({ section, isEditing, onUpdate, onDelete }: TextBlockProps) {
  const content = section.content as {
    heading?: string;
    subheading?: string;
    body?: string;
    textAlign?: TextAlign;
    headingLevel?: HeadingLevel;
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);
  const textAlign = localContent.textAlign || 'left';
  const headingLevel = localContent.headingLevel || 'h1';

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Text block saved');
  };

  const handleChange = (field: string, value: string) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textAlign];

  const showEditMode = isEditing || inlineEdit;

  // View mode with hover edit
  if (!showEditMode) {
    // Don't render if empty
    if (!localContent.heading && !localContent.subheading && !localContent.body) {
      return null;
    }

    return (
      <div className={cn('py-6 relative group', alignClass)}>
        {localContent.heading && (
          headingLevel === 'h1' ? (
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{localContent.heading}</h1>
          ) : headingLevel === 'h2' ? (
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">{localContent.heading}</h2>
          ) : (
            <p className="text-lg font-medium mb-2">{localContent.heading}</p>
          )
        )}
        {localContent.subheading && (
          <p className="text-lg text-muted-foreground mb-4">{localContent.subheading}</p>
        )}
        {localContent.body && (
          <p className="text-base leading-relaxed whitespace-pre-wrap">{localContent.body}</p>
        )}
        {/* Hover edit button - only visible to owners in edit mode */}
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setInlineEdit(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <Card className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleChange('textAlign', 'left')}>
              <AlignLeft className="h-4 w-4 mr-2" />
              Align Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChange('textAlign', 'center')}>
              <AlignCenter className="h-4 w-4 mr-2" />
              Align Center
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChange('textAlign', 'right')}>
              <AlignRight className="h-4 w-4 mr-2" />
              Align Right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleChange('headingLevel', 'h1')}>
              <Heading1 className="h-4 w-4 mr-2" />
              Large Heading
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChange('headingLevel', 'h2')}>
              <Heading2 className="h-4 w-4 mr-2" />
              Medium Heading
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Type className="h-4 w-4" />
          Text Block
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Input
            value={localContent.heading || ''}
            onChange={(e) => handleChange('heading', e.target.value)}
            placeholder="Heading"
            className="text-lg font-semibold"
          />
        </div>
        <div>
          <Input
            value={localContent.subheading || ''}
            onChange={(e) => handleChange('subheading', e.target.value)}
            placeholder="Subheading (optional)"
          />
        </div>
        <div>
          <Textarea
            value={localContent.body || ''}
            onChange={(e) => handleChange('body', e.target.value)}
            placeholder="Body text..."
            rows={4}
          />
        </div>
        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
