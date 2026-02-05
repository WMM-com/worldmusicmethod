import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LayoutType, layoutOptions } from './GridLayout';
import { LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutSelectorProps {
  currentLayout: string | null;
  onLayoutChange: (layout: LayoutType) => void;
}

// Visual representations of layouts
const LAYOUT_VISUALS: Record<string, React.ReactNode> = {
  'full': (
    <div className="flex gap-0.5 h-6">
      <div className="flex-1 bg-primary rounded-sm" />
    </div>
  ),
  'half-left': (
    <div className="flex gap-0.5 h-6">
      <div className="flex-1 bg-primary rounded-sm" />
      <div className="flex-1 bg-muted rounded-sm" />
    </div>
  ),
  'half-right': (
    <div className="flex gap-0.5 h-6">
      <div className="flex-1 bg-muted rounded-sm" />
      <div className="flex-1 bg-primary rounded-sm" />
    </div>
  ),
  'third-left': (
    <div className="flex gap-0.5 h-6">
      <div className="w-1/3 bg-primary rounded-sm" />
      <div className="w-1/3 bg-muted rounded-sm" />
      <div className="w-1/3 bg-muted rounded-sm" />
    </div>
  ),
  'third-center': (
    <div className="flex gap-0.5 h-6">
      <div className="w-1/3 bg-muted rounded-sm" />
      <div className="w-1/3 bg-primary rounded-sm" />
      <div className="w-1/3 bg-muted rounded-sm" />
    </div>
  ),
  'third-right': (
    <div className="flex gap-0.5 h-6">
      <div className="w-1/3 bg-muted rounded-sm" />
      <div className="w-1/3 bg-muted rounded-sm" />
      <div className="w-1/3 bg-primary rounded-sm" />
    </div>
  ),
  'two-thirds-left': (
    <div className="flex gap-0.5 h-6">
      <div className="w-2/3 bg-primary rounded-sm" />
      <div className="w-1/3 bg-muted rounded-sm" />
    </div>
  ),
  'one-third-right': (
    <div className="flex gap-0.5 h-6">
      <div className="w-2/3 bg-muted rounded-sm" />
      <div className="w-1/3 bg-primary rounded-sm" />
    </div>
  ),
  'three-quarter-left': (
    <div className="flex gap-0.5 h-6">
      <div className="w-3/4 bg-primary rounded-sm" />
      <div className="w-1/4 bg-muted rounded-sm" />
    </div>
  ),
  'quarter-right': (
    <div className="flex gap-0.5 h-6">
      <div className="w-3/4 bg-muted rounded-sm" />
      <div className="w-1/4 bg-primary rounded-sm" />
    </div>
  ),
};

// Simplified layout groups for better UX
const LAYOUT_GROUPS = [
  { 
    label: 'Full Width', 
    layouts: ['full'] 
  },
  { 
    label: 'Half Width', 
    layouts: ['half-left', 'half-right'] 
  },
  { 
    label: 'Thirds', 
    layouts: ['third-left', 'third-center', 'third-right', 'two-thirds-left', 'one-third-right'] 
  },
  { 
    label: 'Quarters', 
    layouts: ['three-quarter-left', 'quarter-right'] 
  },
];

export function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (layout: LayoutType) => {
    onLayoutChange(layout);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          title="Change layout"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <Label className="text-sm font-medium">Section Width</Label>
          
          {LAYOUT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs text-muted-foreground">{group.label}</p>
              <div className="grid gap-2">
                {group.layouts.map((layout) => {
                  const isSelected = currentLayout === layout || (!currentLayout && layout === 'full');
                  return (
                    <button
                      key={layout}
                      onClick={() => handleSelect(layout as LayoutType)}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-md border transition-all text-left',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent hover:bg-muted'
                      )}
                    >
                      <div className="w-16 flex-shrink-0">
                        {LAYOUT_VISUALS[layout] || LAYOUT_VISUALS['full']}
                      </div>
                      <span className="text-sm flex-1">
                        {layoutOptions.find(o => o.value === layout)?.label || layout}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
