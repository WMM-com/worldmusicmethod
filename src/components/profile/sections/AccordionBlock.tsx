import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface AccordionItem {
  title: string;
  content: string;
}

interface AccordionBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function AccordionBlock({ section, isEditing, onUpdate }: AccordionBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const items: AccordionItem[] = content.items || [
    { title: 'What services do you offer?', content: 'I offer music production, mixing, mastering, and live performance services.' },
    { title: 'How can I book you?', content: 'You can reach out through the contact form or send me a direct message.' },
    { title: 'What are your rates?', content: 'Rates vary depending on the project. Get in touch for a custom quote.' }
  ];
  const allowMultiple = content.allowMultiple || false;

  const [editState, setEditState] = useState({
    items: items,
    allowMultiple: allowMultiple
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateItem = (index: number, field: keyof AccordionItem, value: string) => {
    const updated = [...editState.items];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, items: updated }));
  };

  const addItem = () => {
    setEditState(s => ({
      ...s,
      items: [...s.items, { title: 'New Question', content: 'Answer here...' }]
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
            <span className="font-medium">Edit Accordion</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowMultiple"
              checked={editState.allowMultiple}
              onChange={(e) => setEditState(s => ({ ...s, allowMultiple: e.target.checked }))}
            />
            <Label htmlFor="allowMultiple">Allow multiple items open</Label>
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
            <Plus className="h-4 w-4 mr-2" /> Add Item
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
      <Accordion type={allowMultiple ? "multiple" : "single"} collapsible className="py-4">
        {items.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
