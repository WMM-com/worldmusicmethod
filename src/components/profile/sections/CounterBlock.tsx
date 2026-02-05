import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CounterItem {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

interface CounterBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplayValue(value);
              clearInterval(timer);
            } else {
              setDisplayValue(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-4xl font-bold text-primary">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </div>
  );
}

export function CounterBlock({ section, isEditing, onUpdate }: CounterBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const counters: CounterItem[] = content.counters || [
    { value: 1000, label: 'Followers', suffix: '+' },
    { value: 50, label: 'Tracks', prefix: '' },
    { value: 10, label: 'Years Experience', suffix: '' }
  ];
  const columns = content.columns || 3;

  const [editState, setEditState] = useState({
    counters: counters,
    columns: columns
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateCounter = (index: number, field: keyof CounterItem, value: any) => {
    const updated = [...editState.counters];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, counters: updated }));
  };

  const addCounter = () => {
    setEditState(s => ({
      ...s,
      counters: [...s.counters, { value: 0, label: 'New Counter' }]
    }));
  };

  const removeCounter = (index: number) => {
    setEditState(s => ({
      ...s,
      counters: s.counters.filter((_, i) => i !== index)
    }));
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Counters</span>
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
            <Label>Columns</Label>
            <Select value={String(editState.columns)} onValueChange={(v) => setEditState(s => ({ ...s, columns: parseInt(v) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {editState.counters.map((counter, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Counter {index + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeCounter(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      type="number"
                      value={counter.value}
                      onChange={(e) => updateCounter(index, 'value', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={counter.label}
                      onChange={(e) => updateCounter(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prefix</Label>
                    <Input
                      value={counter.prefix || ''}
                      onChange={(e) => updateCounter(index, 'prefix', e.target.value)}
                      placeholder="$, £..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Suffix</Label>
                    <Input
                      value={counter.suffix || ''}
                      onChange={(e) => updateCounter(index, 'suffix', e.target.value)}
                      placeholder="+, K, M..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addCounter}>
            <Plus className="h-4 w-4 mr-2" /> Add Counter
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
      <div className={cn("grid gap-6 py-6", `grid-cols-${columns}`)}>
        {counters.map((counter, index) => (
          <div key={index} className="text-center">
            <AnimatedCounter value={counter.value} prefix={counter.prefix} suffix={counter.suffix} />
            <div className="text-muted-foreground mt-1">{counter.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
