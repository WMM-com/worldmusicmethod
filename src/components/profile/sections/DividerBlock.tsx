import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  Minus, EllipsisVertical, Trash2, Pencil
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

interface DividerBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

type DividerStyle = 'solid' | 'dashed' | 'dotted';

export function DividerBlock({ section, isEditing, onUpdate, onDelete }: DividerBlockProps) {
  const content = section.content as {
    style?: DividerStyle;
    thickness?: number;
    width?: number; // percentage
    marginY?: number;
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Divider saved');
  };

  const handleChange = (field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const dividerStyle = {
    borderTopStyle: localContent.style || 'solid',
    borderTopWidth: `${localContent.thickness || 1}px`,
    width: `${localContent.width || 100}%`,
    margin: `${localContent.marginY || 16}px auto`,
  } as React.CSSProperties;

  const showEditMode = isEditing || inlineEdit;

  // View mode
  if (!showEditMode) {
    return (
      <div className="relative group">
        <hr 
          className="border-border" 
          style={dividerStyle}
        />
        {/* Hover edit button - only visible to owners in edit mode */}
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Minus className="h-4 w-4" />
          Divider
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Style</Label>
          <Select
            value={localContent.style || 'solid'}
            onValueChange={(v) => handleChange('style', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Thickness: {localContent.thickness || 1}px</Label>
          <Slider
            value={[localContent.thickness || 1]}
            onValueChange={([v]) => handleChange('thickness', v)}
            min={1}
            max={8}
            step={1}
          />
        </div>

        <div>
          <Label className="text-xs">Width: {localContent.width || 100}%</Label>
          <Slider
            value={[localContent.width || 100]}
            onValueChange={([v]) => handleChange('width', v)}
            min={20}
            max={100}
            step={5}
          />
        </div>

        <div>
          <Label className="text-xs">Vertical Margin: {localContent.marginY || 16}px</Label>
          <Slider
            value={[localContent.marginY || 16]}
            onValueChange={([v]) => handleChange('marginY', v)}
            min={4}
            max={64}
            step={4}
          />
        </div>

        {/* Preview */}
        <div className="py-4 border rounded-md bg-muted/30">
          <hr className="border-border" style={dividerStyle} />
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
