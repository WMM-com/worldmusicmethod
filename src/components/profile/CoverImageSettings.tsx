import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2 } from 'lucide-react';

export interface CoverSettings {
  height?: 'small' | 'medium' | 'large';
  focalPointX?: number; // 0-100
  focalPointY?: number; // 0-100
}

interface CoverImageSettingsProps {
  settings: CoverSettings;
  coverImageUrl?: string | null;
  onUpdate: (settings: CoverSettings) => void;
}

const heightOptions = [
  { value: 'small', label: 'Small', pixels: '192px' },
  { value: 'medium', label: 'Medium', pixels: '256px' },
  { value: 'large', label: 'Large', pixels: '320px' },
];

export function CoverImageSettings({ settings, coverImageUrl, onUpdate }: CoverImageSettingsProps) {
  const [localSettings, setLocalSettings] = useState<CoverSettings>(settings);

  const handleHeightChange = (value: string) => {
    const newSettings = { ...localSettings, height: value as CoverSettings['height'] };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  const handleFocalPointChange = (axis: 'X' | 'Y', value: number[]) => {
    const key = `focalPoint${axis}` as 'focalPointX' | 'focalPointY';
    const newSettings = { ...localSettings, [key]: value[0] };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Cover Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cover Height</Label>
            <Select 
              value={localSettings.height || 'medium'} 
              onValueChange={handleHeightChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {heightOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} ({opt.pixels})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {coverImageUrl && (
            <>
              <div className="space-y-2">
                <Label>Horizontal Focus ({localSettings.focalPointX ?? 50}%)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Left</span>
                  <Slider
                    value={[localSettings.focalPointX ?? 50]}
                    onValueChange={(v) => handleFocalPointChange('X', v)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">Right</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vertical Focus ({localSettings.focalPointY ?? 50}%)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Top</span>
                  <Slider
                    value={[localSettings.focalPointY ?? 50]}
                    onValueChange={(v) => handleFocalPointChange('Y', v)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">Bottom</span>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div 
                  className="w-full h-20 rounded-md overflow-hidden border"
                  style={{
                    backgroundImage: `url(${coverImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${localSettings.focalPointX ?? 50}% ${localSettings.focalPointY ?? 50}%`,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to get CSS classes from settings
export function getCoverHeightClass(height?: CoverSettings['height']): string {
  switch (height) {
    case 'small': return 'h-48';
    case 'large': return 'h-80 md:h-96';
    case 'medium':
    default: return 'h-48 sm:h-64 md:h-80';
  }
}

export function getCoverFocalPoint(settings?: CoverSettings): string {
  const x = settings?.focalPointX ?? 50;
  const y = settings?.focalPointY ?? 50;
  return `${x}% ${y}%`;
}
