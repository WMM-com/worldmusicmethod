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
import { Settings2, Edit2, Image, Trash2 } from 'lucide-react';
import { HeroEditor } from './HeroEditor';
import { HeroType, HeroConfig } from './HeroSection';
import { CoverSettings } from '@/hooks/useHeroSettings';

interface HeroOverlayControlsProps {
  heroType: HeroType;
  heroConfig: HeroConfig;
  coverSettings: CoverSettings;
  coverImageUrl?: string | null;
  onUpdateHero: (type: HeroType, config: HeroConfig) => void;
  onUpdateCoverSettings: (settings: CoverSettings) => void;
  onRemoveCover?: () => void;
}

const heightOptions = [
  { value: 'small', label: 'Small', pixels: '192px' },
  { value: 'medium', label: 'Medium', pixels: '256px' },
  { value: 'large', label: 'Large', pixels: '320px' },
];

export function HeroOverlayControls({
  heroType,
  heroConfig,
  coverSettings,
  coverImageUrl,
  onUpdateHero,
  onUpdateCoverSettings,
  onRemoveCover,
}: HeroOverlayControlsProps) {
  const [localSettings, setLocalSettings] = useState<CoverSettings>(coverSettings);

  const handleHeightChange = (value: string) => {
    const newSettings = { ...localSettings, height: value as CoverSettings['height'] };
    setLocalSettings(newSettings);
    onUpdateCoverSettings(newSettings);
  };

  const handleFocalPointChange = (axis: 'X' | 'Y', value: number[]) => {
    const key = `focalPoint${axis}` as 'focalPointX' | 'focalPointY';
    const newSettings = { ...localSettings, [key]: value[0] };
    setLocalSettings(newSettings);
    onUpdateCoverSettings(newSettings);
  };

  // Check if we're using standard hero with cover image (the most common case)
  const isStandardWithCover = heroType === 'standard' && (heroConfig.backgroundImage || coverImageUrl);

  return (
    <div className="absolute top-4 right-4 z-20 flex gap-2">
      {/* Hero Editor */}
      <HeroEditor
        heroType={heroType}
        heroConfig={heroConfig}
        onSave={onUpdateHero}
        trigger={
          <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
            <Edit2 className="h-4 w-4" />
            Edit Hero
          </Button>
        }
      />

      {/* Cover/Background Settings - only show if there's a background image */}
      {(heroConfig.backgroundImage || coverImageUrl) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
              <Settings2 className="h-4 w-4" />
              Cover Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
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
                    backgroundImage: `url(${heroConfig.backgroundImage || coverImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${localSettings.focalPointX ?? 50}% ${localSettings.focalPointY ?? 50}%`,
                  }}
                />
              </div>

              {/* Remove Cover option */}
              {onRemoveCover && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRemoveCover}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Cover Image
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}