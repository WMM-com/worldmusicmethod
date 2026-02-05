import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface SliderItem {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
}

interface SliderBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function SliderBlock({ section, isEditing, onUpdate }: SliderBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const sliders: SliderItem[] = content.sliders || [
    { label: 'Energy Level', value: 75, min: 0, max: 100, unit: '%' },
    { label: 'Complexity', value: 50, min: 0, max: 100, unit: '%' }
  ];
  const title = content.title || '';
  const interactive = content.interactive || false;

  const [editState, setEditState] = useState({
    sliders: sliders,
    title: title,
    interactive: interactive
  });

  const [liveValues, setLiveValues] = useState<number[]>(sliders.map(s => s.value));

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateSlider = (index: number, field: keyof SliderItem, value: any) => {
    const updated = [...editState.sliders];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, sliders: updated }));
  };

  const addSlider = () => {
    setEditState(s => ({
      ...s,
      sliders: [...s.sliders, { label: 'New Slider', value: 50, min: 0, max: 100, unit: '%' }]
    }));
    setLiveValues(prev => [...prev, 50]);
  };

  const removeSlider = (index: number) => {
    setEditState(s => ({
      ...s,
      sliders: s.sliders.filter((_, i) => i !== index)
    }));
    setLiveValues(prev => prev.filter((_, i) => i !== index));
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Sliders</span>
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
              placeholder="Attributes, Skills..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="interactive"
              checked={editState.interactive}
              onChange={(e) => setEditState(s => ({ ...s, interactive: e.target.checked }))}
            />
            <Label htmlFor="interactive">Allow visitors to interact with sliders</Label>
          </div>

          <div className="space-y-3">
            {editState.sliders.map((slider, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Slider {index + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeSlider(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={slider.label}
                      onChange={(e) => updateSlider(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Default Value</Label>
                    <Input
                      type="number"
                      value={slider.value}
                      onChange={(e) => updateSlider(index, 'value', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={slider.unit || ''}
                      onChange={(e) => updateSlider(index, 'unit', e.target.value)}
                      placeholder="%"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min</Label>
                    <Input
                      type="number"
                      value={slider.min}
                      onChange={(e) => updateSlider(index, 'min', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max</Label>
                    <Input
                      type="number"
                      value={slider.max}
                      onChange={(e) => updateSlider(index, 'max', parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addSlider}>
            <Plus className="h-4 w-4 mr-2" /> Add Slider
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
      <div className="space-y-6">
        {sliders.map((slider, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{slider.label}</span>
              <span className="text-muted-foreground">
                {interactive ? liveValues[index] : slider.value}{slider.unit}
              </span>
            </div>
            <Slider
              value={[interactive ? liveValues[index] : slider.value]}
              min={slider.min}
              max={slider.max}
              step={1}
              onValueChange={interactive ? (v) => {
                const newValues = [...liveValues];
                newValues[index] = v[0];
                setLiveValues(newValues);
              } : undefined}
              disabled={!interactive}
              className={!interactive ? "pointer-events-none" : ""}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
