import { useState, useRef } from 'react';
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
import { Settings2, Edit2, Camera, Trash2, Loader2 } from 'lucide-react';
import { HeroEditor } from './HeroEditor';
import { HeroType, HeroConfig } from './HeroSection';
import { CoverSettings } from '@/hooks/useHeroSettings';
import { useR2Upload } from '@/hooks/useR2Upload';
import { toast } from 'sonner';

interface HeroOverlayControlsProps {
  heroType: HeroType;
  heroConfig: HeroConfig;
  coverSettings: CoverSettings;
  coverImageUrl?: string | null;
  onUpdateHero: (type: HeroType, config: HeroConfig) => void;
  onUpdateCoverSettings: (settings: CoverSettings) => void;
  onUpdateCoverImage?: (url: string) => Promise<void>;
  onRemoveCover?: () => void;
}

// Check if the template uses background images
const templateUsesBackgroundImage = (type: HeroType) => type === 'standard' || type === 'slay';

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
  onUpdateCoverImage,
  onRemoveCover,
}: HeroOverlayControlsProps) {
  const [localSettings, setLocalSettings] = useState<CoverSettings>(coverSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { uploadFile, isUploading } = useR2Upload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHeightChange = (value: string) => {
    const newSettings = { ...localSettings, height: value as CoverSettings['height'] };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleFocalPointChange = (axis: 'X' | 'Y', value: number[]) => {
    const key = `focalPoint${axis}` as 'focalPointX' | 'focalPointY';
    const newSettings = { ...localSettings, [key]: value[0] };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    onUpdateCoverSettings(localSettings);
    setHasUnsavedChanges(false);
    toast.success('Cover settings saved');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateCoverImage) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'covers',
      imageOptimization: 'media',
      trackInDatabase: true,
    });

    if (result) {
      await onUpdateCoverImage(result.url);
      toast.success('Cover image updated');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasCoverImage = heroConfig.backgroundImage || coverImageUrl;
  const showCoverControls = templateUsesBackgroundImage(heroType);

  return (
    <>
      {/* Hidden file input for cover upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />

      {/* Icon CTA for adding cover image - centered (only shown when no cover and standard template) */}
      {showCoverControls && !hasCoverImage && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors shadow-lg"
          title="Add cover image"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">Add Cover</span>
        </button>
      )}

      {/* Top-left: Cover settings icon when cover exists (only for standard template) */}
      {showCoverControls && hasCoverImage && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {/* Change cover button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors shadow-lg"
            title="Change cover image"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          
          {/* Cover settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors shadow-lg"
                title="Cover settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
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

                {/* Save Changes button */}
                <Button 
                  size="sm" 
                  onClick={handleSaveSettings}
                  disabled={!hasUnsavedChanges}
                  className="w-full"
                >
                  Save Changes
                </Button>

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
        </div>
      )}

      {/* Top-right: Hero editor */}
      <div className="absolute top-4 right-4 z-20">
        <HeroEditor
          heroType={heroType}
          heroConfig={heroConfig}
          onSave={onUpdateHero}
          trigger={
            <Button size="sm" className="gap-2 shadow-lg bg-background text-foreground border border-border hover:bg-muted">
              <Edit2 className="h-4 w-4" />
              Edit Hero
            </Button>
          }
        />
      </div>
    </>
  );
}