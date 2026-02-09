import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LayoutType } from './GridLayout';
import { LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutSelectorProps {
  currentLayout: string | null;
  onLayoutChange: (layout: LayoutType) => void;
}

// Simplified layout options with visual grid representations
const LAYOUT_OPTIONS: { 
  value: LayoutType; 
  label: string; 
  visual: React.ReactNode;
  description: string;
}[] = [
  { 
    value: 'full', 
    label: 'Full Width', 
    description: '100%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="flex-1 bg-primary rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'half-left', 
    label: 'Half (Left)', 
    description: '50%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="flex-1 bg-primary rounded-sm" />
        <div className="flex-1 bg-muted rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'half-right', 
    label: 'Half (Right)', 
    description: '50%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="flex-1 bg-muted rounded-sm" />
        <div className="flex-1 bg-primary rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'third-left', 
    label: 'Third (Left)', 
    description: '33%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="w-1/3 bg-primary rounded-sm" />
        <div className="w-1/3 bg-muted rounded-sm" />
        <div className="w-1/3 bg-muted rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'third-center', 
    label: 'Third (Center)', 
    description: '33%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="w-1/3 bg-muted rounded-sm" />
        <div className="w-1/3 bg-primary rounded-sm" />
        <div className="w-1/3 bg-muted rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'third-right', 
    label: 'Third (Right)', 
    description: '33%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="w-1/3 bg-muted rounded-sm" />
        <div className="w-1/3 bg-muted rounded-sm" />
        <div className="w-1/3 bg-primary rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'two-thirds-left', 
    label: 'Two Thirds (Left)', 
    description: '66%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="w-2/3 bg-primary rounded-sm" />
        <div className="w-1/3 bg-muted rounded-sm" />
      </div>
    ),
  },
  { 
    value: 'one-third-right', 
    label: 'One Third (Right)', 
    description: '33%',
    visual: (
      <div className="flex gap-0.5 h-6 w-full">
        <div className="w-2/3 bg-muted rounded-sm" />
        <div className="w-1/3 bg-primary rounded-sm" />
      </div>
    ),
  },
];

// Grouped layout options for better UX
const LAYOUT_GROUPS = [
  { 
    label: 'Full Width', 
    layouts: ['full'] 
  },
  { 
    label: 'Half Width (50/50)', 
    layouts: ['half-left', 'half-right'] 
  },
  { 
    label: 'Thirds (33/33/33)', 
    layouts: ['third-left', 'third-center', 'third-right'] 
  },
  { 
    label: 'Two-Thirds (66/33)', 
    layouts: ['two-thirds-left', 'one-third-right'] 
  },
];

export function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (layout: LayoutType) => {
    onLayoutChange(layout);
    setOpen(false);
  };

  const getLayoutOption = (layoutValue: string) => 
    LAYOUT_OPTIONS.find(o => o.value === layoutValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-auto w-auto p-1"
          title="Change layout width"
        >
          <LayoutGrid className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Section Width</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Set this section's width. Place sections with complementary widths 
              next to each other (e.g., Half Left + Half Right) to create rows.
            </p>
          </div>
          
          {LAYOUT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="grid gap-2">
                {group.layouts.map((layoutValue) => {
                  const option = getLayoutOption(layoutValue);
                  if (!option) return null;
                  
                  const isSelected = currentLayout === layoutValue || (!currentLayout && layoutValue === 'full');
                  
                  return (
                    <button
                      key={layoutValue}
                      onClick={() => handleSelect(layoutValue as LayoutType)}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-md border transition-all text-left w-full',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className="w-20 flex-shrink-0">
                        {option.visual}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{option.description}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
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
