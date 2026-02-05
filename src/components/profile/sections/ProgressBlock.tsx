import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface ProgressItem {
  label: string;
  value: number;
  color?: string;
}

interface ProgressBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function ProgressBlock({ section, isEditing, onUpdate }: ProgressBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const items: ProgressItem[] = content.items || [
    { label: 'Guitar', value: 90 },
    { label: 'Piano', value: 75 },
    { label: 'Vocals', value: 85 }
  ];
  const showPercentage = content.showPercentage !== false;
  const title = content.title || '';

  const [editState, setEditState] = useState({
    items: items,
    showPercentage: showPercentage,
    title: title
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateItem = (index: number, field: keyof ProgressItem, value: any) => {
    const updated = [...editState.items];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, items: updated }));
  };

  const addItem = () => {
    setEditState(s => ({
      ...s,
      items: [...s.items, { label: 'New Skill', value: 50 }]
    }));
  };

  const removeItem = (index: number) => {
    setEditState(s => ({
      ...s,
      items: s.items.filter((_, i) => i !== index)
    }));
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Progress Bars</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div>
            <Label>Section Title (optional)</Label>
            <Input
              value={editState.title}
              onChange={(e) => setEditState(s => ({ ...s, title: e.target.value }))}
              placeholder="Skills, Expertise..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPercentage"
              checked={editState.showPercentage}
              onChange={(e) => setEditState(s => ({ ...s, showPercentage: e.target.checked }))}
            />
            <Label htmlFor="showPercentage">Show percentage</Label>
          </div>

          <div className="space-y-3">
            {editState.items.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Value (0-100)</Label>
                    <Input
                      type="number"
                      value={item.value}
                      onChange={(e) => updateItem(index, 'value', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Progress Bar
          </Button>
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
      <div className="py-4 space-y-4">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{item.label}</span>
              {showPercentage && <span className="text-muted-foreground">{item.value}%</span>}
            </div>
            <Progress value={item.value} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
