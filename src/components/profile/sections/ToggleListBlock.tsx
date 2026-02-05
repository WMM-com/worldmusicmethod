import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil, Check, X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToggleItem {
  title: string;
  content: string;
}

interface ToggleListBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function ToggleListBlock({ section, isEditing, onUpdate }: ToggleListBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [openItems, setOpenItems] = useState<number[]>([]);
  const content = section.content || {};
  
  const items: ToggleItem[] = content.items || [
    { title: 'Click to expand', content: 'This content is revealed when you click the toggle.' },
    { title: 'Another toggle item', content: 'You can add as many toggle items as you need.' }
  ];
  const title = content.title || '';

  const [editState, setEditState] = useState({
    items: items,
    title: title
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateItem = (index: number, field: keyof ToggleItem, value: string) => {
    const updated = [...editState.items];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, items: updated }));
  };

  const addItem = () => {
    setEditState(s => ({
      ...s,
      items: [...s.items, { title: 'New Toggle', content: 'Toggle content here...' }]
    }));
  };

  const removeItem = (index: number) => {
    setEditState(s => ({
      ...s,
      items: s.items.filter((_, i) => i !== index)
    }));
  };

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Toggle List</span>
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
              placeholder="FAQ, Details..."
            />
          </div>

          <div className="space-y-3">
            {editState.items.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Toggle {index + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={item.content}
                    onChange={(e) => updateItem(index, 'content', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Toggle
          </Button>
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
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <Collapsible 
            key={index} 
            open={openItems.includes(index)}
            onOpenChange={() => toggleItem(index)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                openItems.includes(index) && "rotate-90"
              )} />
              <span className="font-medium text-left">{item.title}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-9 pr-3 py-2">
              <p className="text-muted-foreground">{item.content}</p>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
