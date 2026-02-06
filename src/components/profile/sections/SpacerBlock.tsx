import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  MoveVertical, Settings, Trash2, Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface SpacerBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function SpacerBlock({ section, isEditing, onUpdate, onDelete }: SpacerBlockProps) {
  const content = section.content as {
    height?: number;
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Spacer saved');
  };

  const handleChange = (field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const height = localContent.height || 32;
  const showEditMode = isEditing || inlineEdit;

  // View mode
  if (!showEditMode) {
    return (
      <div 
        className="relative group" 
        style={{ height: `${height}px` }}
      >
        {/* Hover edit button - only visible to owners in edit mode */}
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <Settings className="h-4 w-4" />
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
          <MoveVertical className="h-4 w-4" />
          Spacer
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Height: {height}px</Label>
          <Slider
            value={[height]}
            onValueChange={([v]) => handleChange('height', v)}
            min={8}
            max={200}
            step={8}
          />
        </div>

        {/* Preview */}
        <div className="border rounded-md bg-muted/30 relative" style={{ height: `${height}px` }}>
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {height}px
          </div>
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
