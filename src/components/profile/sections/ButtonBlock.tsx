import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  MousePointer2, Settings, Trash2, AlignLeft, AlignCenter, AlignRight, Pencil
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

interface ButtonBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'default' | 'lg';
type TextAlign = 'left' | 'center' | 'right';

export function ButtonBlock({ section, isEditing, onUpdate, onDelete }: ButtonBlockProps) {
  const content = section.content as {
    label?: string;
    url?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    align?: TextAlign;
    fullWidth?: boolean;
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Button saved');
  };

  const handleChange = (field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[localContent.align || 'center'];

  const showEditMode = isEditing || inlineEdit;

  // View mode
  if (!showEditMode) {
    if (!localContent.label) return null;

    return (
      <div className={cn('py-4 flex relative group', alignClass)}>
        <Button
          variant={localContent.variant || 'default'}
          size={localContent.size || 'default'}
          className={cn(localContent.fullWidth && 'w-full')}
          onClick={() => {
            if (localContent.url) {
              window.open(localContent.url, '_blank');
            }
          }}
        >
          {localContent.label}
        </Button>
        {/* Hover edit button for owners */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setInlineEdit(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
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
              <Settings className="h-4 w-4" />
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
            <DropdownMenuItem 
              onClick={() => handleChange('fullWidth', !localContent.fullWidth)}
            >
              {localContent.fullWidth ? 'Disable' : 'Enable'} Full Width
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
          <MousePointer2 className="h-4 w-4" />
          Button Block
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Button Text *</Label>
          <Input
            value={localContent.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Click me"
          />
        </div>

        <div>
          <Label>Link URL</Label>
          <Input
            value={localContent.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Style</Label>
            <Select
              value={localContent.variant || 'default'}
              onValueChange={(v) => handleChange('variant', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Size</Label>
            <Select
              value={localContent.size || 'default'}
              onValueChange={(v) => handleChange('size', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="default">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className={cn('py-4 flex border rounded-md bg-muted/30', alignClass)}>
          <Button
            variant={localContent.variant || 'default'}
            size={localContent.size || 'default'}
            className={cn(localContent.fullWidth && 'w-full mx-4')}
          >
            {localContent.label || 'Button Preview'}
          </Button>
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
