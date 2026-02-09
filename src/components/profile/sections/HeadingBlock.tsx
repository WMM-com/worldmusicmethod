import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  Heading, EllipsisVertical, Trash2, AlignLeft, AlignCenter, AlignRight, Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HeadingBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';
type TextAlign = 'left' | 'center' | 'right';

const HEADING_STYLES: Record<HeadingLevel, string> = {
  h1: 'text-4xl md:text-5xl font-bold',
  h2: 'text-3xl md:text-4xl font-bold',
  h3: 'text-2xl md:text-3xl font-semibold',
  h4: 'text-xl md:text-2xl font-semibold',
  h5: 'text-lg md:text-xl font-medium',
  p: 'text-base',
};

export function HeadingBlock({ section, isEditing, onUpdate, onDelete }: HeadingBlockProps) {
  const content = section.content as {
    text?: string;
    level?: HeadingLevel;
    align?: TextAlign;
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Heading saved');
  };

  const handleChange = (field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const level = localContent.level || 'h2';
  const align = localContent.align || 'left';

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const showEditMode = isEditing || inlineEdit;

  // View mode
  if (!showEditMode) {
    if (!localContent.text) return null;

    const HeadingTag = level === 'p' ? 'p' : level;

    return (
      <div className={cn('py-2 relative group', alignClass)}>
        <HeadingTag className={HEADING_STYLES[level]}>
          {localContent.text}
        </HeadingTag>
        {/* Hover edit button */}
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setInlineEdit(true)}
          >
            <Pencil className="h-3 w-3" />
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
            <DropdownMenuItem onClick={() => handleChange('align', 'left')}>
              <AlignLeft className="h-4 w-4 mr-2" />
              Align Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChange('align', 'center')}>
              <AlignCenter className="h-4 w-4 mr-2" />
              Align Center
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChange('align', 'right')}>
              <AlignRight className="h-4 w-4 mr-2" />
              Align Right
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
          <Heading className="h-4 w-4" />
          Heading Block
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Input
            value={localContent.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Enter heading text..."
            className={cn('text-lg font-semibold', alignClass)}
          />
        </div>

        <div>
          <Select
            value={level}
            onValueChange={(v) => handleChange('level', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h1">H1 - Largest</SelectItem>
              <SelectItem value="h2">H2 - Large</SelectItem>
              <SelectItem value="h3">H3 - Medium</SelectItem>
              <SelectItem value="h4">H4 - Small</SelectItem>
              <SelectItem value="h5">H5 - Smallest</SelectItem>
              <SelectItem value="p">Paragraph</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className={cn('py-4 px-4 border rounded-md bg-muted/30', alignClass)}>
          {localContent.text ? (
            <span className={HEADING_STYLES[level]}>{localContent.text}</span>
          ) : (
            <span className="text-muted-foreground">Preview</span>
          )}
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
