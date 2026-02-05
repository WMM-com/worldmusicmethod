import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

const ICON_OPTIONS = [
  'Star', 'Heart', 'Music', 'Mic', 'Headphones', 'Play', 'Award', 'Trophy',
  'Users', 'Globe', 'Calendar', 'Clock', 'Mail', 'Phone', 'MapPin', 'Link',
  'Instagram', 'Youtube', 'Twitter', 'Facebook', 'Linkedin', 'Github',
  'Camera', 'Video', 'Image', 'FileText', 'Download', 'Upload', 'Share2',
  'ThumbsUp', 'MessageCircle', 'Bell', 'Settings', 'Home', 'Search', 'Menu'
];

export function IconBlock({ section, isEditing, onUpdate }: IconBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const iconName = content.icon || 'Star';
  const iconSize = content.size || 48;
  const iconColor = content.color || 'hsl(var(--primary))';
  const label = content.label || '';
  const alignment = content.alignment || 'center';

  const [editState, setEditState] = useState({
    icon: iconName,
    size: iconSize,
    color: iconColor,
    label: label,
    alignment: alignment
  });

  const IconComponent = (LucideIcons as any)[editState.icon] || LucideIcons.Star;

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }[alignment] || 'justify-center';

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Icon</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Icon</Label>
              <Select value={editState.icon} onValueChange={(v) => setEditState(s => ({ ...s, icon: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ICON_OPTIONS.map(icon => {
                    const Icon = (LucideIcons as any)[icon];
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Size (px)</Label>
              <Input
                type="number"
                value={editState.size}
                onChange={(e) => setEditState(s => ({ ...s, size: parseInt(e.target.value) || 48 }))}
                min={16}
                max={200}
              />
            </div>
            
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={editState.color.startsWith('#') ? editState.color : '#6366f1'}
                onChange={(e) => setEditState(s => ({ ...s, color: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Alignment</Label>
              <Select value={editState.alignment} onValueChange={(v) => setEditState(s => ({ ...s, alignment: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label>Label (optional)</Label>
              <Input
                value={editState.label}
                onChange={(e) => setEditState(s => ({ ...s, label: e.target.value }))}
                placeholder="Icon label..."
              />
            </div>
          </div>

          <div className={cn("flex items-center gap-2 p-4 bg-muted rounded", alignmentClass)}>
            <IconComponent style={{ width: editState.size, height: editState.size, color: editState.color }} />
            {editState.label && <span className="text-sm font-medium">{editState.label}</span>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group relative">
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
      <div className={cn("flex items-center gap-2 py-4", alignmentClass)}>
        <IconComponent style={{ width: iconSize, height: iconSize, color: iconColor }} />
        {label && <span className="font-medium">{label}</span>}
      </div>
    </div>
  );
}
