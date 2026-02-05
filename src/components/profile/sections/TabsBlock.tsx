import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface TabItem {
  label: string;
  content: string;
}

interface TabsBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function TabsBlock({ section, isEditing, onUpdate }: TabsBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const tabs: TabItem[] = content.tabs || [
    { label: 'About', content: 'Information about me and my music journey.' },
    { label: 'Experience', content: 'Years of experience in various genres and styles.' },
    { label: 'Contact', content: 'Get in touch for collaborations and bookings.' }
  ];

  const [editState, setEditState] = useState({
    tabs: tabs
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateTab = (index: number, field: keyof TabItem, value: string) => {
    const updated = [...editState.tabs];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, tabs: updated }));
  };

  const addTab = () => {
    setEditState(s => ({
      ...s,
      tabs: [...s.tabs, { label: 'New Tab', content: 'Tab content here...' }]
    }));
  };

  const removeTab = (index: number) => {
    if (editState.tabs.length <= 1) return;
    setEditState(s => ({
      ...s,
      tabs: s.tabs.filter((_, i) => i !== index)
    }));
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Tabs</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {editState.tabs.map((tab, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tab {index + 1}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => removeTab(index)}
                    disabled={editState.tabs.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={tab.label}
                    onChange={(e) => updateTab(index, 'label', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={tab.content}
                    onChange={(e) => updateTab(index, 'content', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addTab}>
            <Plus className="h-4 w-4 mr-2" /> Add Tab
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
      <Tabs defaultValue="tab-0" className="w-full">
        <TabsList className="w-full justify-start">
          {tabs.map((tab, index) => (
            <TabsTrigger key={index} value={`tab-${index}`}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab, index) => (
          <TabsContent key={index} value={`tab-${index}`} className="mt-4">
            <p className="text-muted-foreground">{tab.content}</p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
