import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, X, Clock, Pencil } from 'lucide-react';
import { PreciseTiming } from '@/types/database';
import { cn } from '@/lib/utils';

const DEFAULT_TIMING_PRESETS = [
  { label: 'Load In', time: '' },
  { label: 'Soundcheck', time: '' },
  { label: 'Gig Start', time: '' },
  { label: 'Curfew', time: '' },
];

interface PreciseTimingsProps {
  timings: PreciseTiming[];
  onChange: (timings: PreciseTiming[]) => void;
}

export function PreciseTimings({ timings, onChange }: PreciseTimingsProps) {
  const [isOpen, setIsOpen] = useState(timings.length > 0);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const addTiming = (label: string = 'Custom Timing') => {
    const id = crypto.randomUUID();
    onChange([...timings, { id, label, time: '' }]);
  };

  const removeTiming = (id: string) => {
    onChange(timings.filter(t => t.id !== id));
  };

  const updateTiming = (id: string, updates: Partial<PreciseTiming>) => {
    onChange(timings.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addPresets = () => {
    const existing = timings.map(t => t.label.toLowerCase());
    const newTimings = DEFAULT_TIMING_PRESETS
      .filter(p => !existing.includes(p.label.toLowerCase()))
      .map(p => ({ id: crypto.randomUUID(), ...p }));
    onChange([...timings, ...newTimings]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" type="button" className="w-full justify-between px-3 py-2 h-auto text-sm font-medium text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Precise Timings
            {timings.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {timings.length}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {timings.length === 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPresets}
            className="w-full text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Standard Timings
          </Button>
        )}

        {timings.map((timing) => (
          <div key={timing.id} className="flex items-center gap-2">
            {editingLabel === timing.id ? (
              <Input
                value={timing.label}
                onChange={(e) => updateTiming(timing.id, { label: e.target.value })}
                onBlur={() => setEditingLabel(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(null)}
                autoFocus
                className="flex-1 h-8 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingLabel(timing.id)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground flex-1 text-left min-w-[100px]"
              >
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                <span className="truncate">{timing.label}</span>
              </button>
            )}
            <Input
              type="time"
              value={timing.time}
              onChange={(e) => updateTiming(timing.id, { time: e.target.value })}
              className="w-[130px] h-8 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeTiming(timing.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {timings.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addTiming()}
            className="w-full text-xs text-muted-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Custom Timing
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
