import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useR2Upload } from '@/hooks/useR2Upload';
import { HeroType, HeroConfig } from './HeroSection';
import { 
  Image, 
  Upload, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Loader2,
  Sparkles,
  Type,
  Scissors,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HeroEditorProps {
  heroType: HeroType;
  heroConfig: HeroConfig;
  onSave: (type: HeroType, config: HeroConfig) => void;
  trigger?: React.ReactNode;
}

const HERO_TEMPLATES: { type: HeroType; label: string; description: string; icon: typeof Image }[] = [
  { 
    type: 'standard', 
    label: 'Standard', 
    description: 'Cover image for your hero section',
    icon: Image
  },
  { 
    type: 'slay', 
    label: 'Slay', 
    description: 'Full background image with text overlay',
    icon: Layers
  },
  { 
    type: 'cut-out', 
    label: 'Cut-out', 
    description: 'Transparent PNG over solid background',
    icon: Scissors
  },
  { 
    type: 'minimal', 
    label: 'Minimal', 
    description: 'Clean text on solid color',
    icon: Type
  },
];

// Templates that support content editing
const CONTENT_ENABLED_TEMPLATES: HeroType[] = ['slay', 'cut-out', 'minimal'];
// Templates that use background images
const BG_IMAGE_TEMPLATES: HeroType[] = ['standard', 'slay'];

export function HeroEditor({ heroType, heroConfig, onSave, trigger }: HeroEditorProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<HeroType>(heroType || 'standard');
  const [config, setConfig] = useState<HeroConfig>(heroConfig || {});
  const { uploadFile, isUploading, progress } = useR2Upload();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedType(heroType || 'standard');
      setConfig(heroConfig || {});
    }
    setOpen(isOpen);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'backgroundImage' | 'cutoutImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'hero-images',
      imageOptimization: 'media',
      trackInDatabase: true,
    });

    if (result) {
      setConfig(prev => ({ ...prev, [field]: result.url }));
      toast.success('Image uploaded');
    }
  };

  const handleSave = () => {
    onSave(selectedType, config);
    setOpen(false);
  };

  const contentEnabled = CONTENT_ENABLED_TEMPLATES.includes(selectedType);
  const bgImageEnabled = BG_IMAGE_TEMPLATES.includes(selectedType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Edit Hero
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Hero Section</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="template" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="content" disabled={!contentEnabled}>
              Content {!contentEnabled && '🔒'}
            </TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>

          {/* Template Selection */}
          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {HERO_TEMPLATES.map(({ type, label, description, icon: Icon }) => (
                <Card 
                  key={type}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedType === type && 'border-primary ring-2 ring-primary/20'
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={cn(
                      'p-3 rounded-lg',
                      selectedType === type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{label}</h3>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <div className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                      selectedType === type 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-muted-foreground'
                    )}>
                      {selectedType === type && <Check className="h-3 w-3" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content - locked for Standard */}
          <TabsContent value="content" className="space-y-4 mt-4">
            {!contentEnabled ? (
              <div className="text-center py-8 text-muted-foreground">
                <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Content editing is not available for the Standard template.</p>
                <p className="text-sm mt-1">Switch to Slay, Cut-out, or Minimal to add text.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Title</Label>
                    <span className="text-xs text-muted-foreground">
                      {(config.title || '').length}/60
                    </span>
                  </div>
                  <Input
                    value={config.title || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 60) {
                        setConfig(prev => ({ ...prev, title: e.target.value }));
                      }
                    }}
                    placeholder="Your Name or Brand"
                    maxLength={60}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Subtitle</Label>
                    <span className="text-xs text-muted-foreground">
                      {(config.subtitle || '').length}/120
                    </span>
                  </div>
                  <Input
                    value={config.subtitle || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 120) {
                        setConfig(prev => ({ ...prev, subtitle: e.target.value }));
                      }
                    }}
                    placeholder="Musician • Producer • Artist"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Description</Label>
                    <span className="text-xs text-muted-foreground">
                      {(config.description || '').length}/300
                    </span>
                  </div>
                  <Textarea
                    value={config.description || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        setConfig(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    placeholder="A brief introduction..."
                    rows={3}
                    maxLength={300}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <Button
                        key={align}
                        type="button"
                        variant={config.textAlign === align ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig(prev => ({ ...prev, textAlign: align }))}
                        className="flex-1"
                      >
                        {align === 'left' && <AlignLeft className="h-4 w-4" />}
                        {align === 'center' && <AlignCenter className="h-4 w-4" />}
                        {align === 'right' && <AlignRight className="h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Style */}
          <TabsContent value="style" className="space-y-4 mt-4">
            {/* Background Color */}
            <div className="space-y-3">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.backgroundColor || '#1a1a2e'}
                  onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={config.backgroundColor || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  placeholder="#1a1a2e"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background Image (for standard & slay) */}
            {bgImageEnabled && (
              <div className="space-y-3">
                <Label>Background Image</Label>
                {config.backgroundImage ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src={config.backgroundImage} 
                      alt="Background" 
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setConfig(prev => ({ ...prev, backgroundImage: undefined }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="hero-bg-upload"
                      onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                    />
                    <label htmlFor="hero-bg-upload" className="cursor-pointer">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload background
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Overlay Settings (for standard & slay) */}
            {bgImageEnabled && (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label>Image Overlay</Label>
                  <Switch
                    checked={config.overlayEnabled ?? false}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, overlayEnabled: checked }))}
                  />
                </div>
                {config.overlayEnabled && (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={config.overlayColor || '#000000'}
                        onChange={(e) => setConfig(prev => ({ ...prev, overlayColor: e.target.value }))}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Opacity ({config.overlayOpacity ?? 40}%)</Label>
                        <Slider
                          value={[config.overlayOpacity ?? 40]}
                          onValueChange={(v) => setConfig(prev => ({ ...prev, overlayOpacity: v[0] }))}
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image Size & Position (for standard & slay) */}
            {bgImageEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image Size</Label>
                  <Select
                    value={config.imageSize || 'cover'}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, imageSize: v as HeroConfig['imageSize'] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover (Fill)</SelectItem>
                      <SelectItem value="contain">Contain (Fit)</SelectItem>
                      <SelectItem value="auto">Original Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image Position</Label>
                  <Select
                    value={config.imagePosition || 'center'}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, imagePosition: v as HeroConfig['imagePosition'] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Text Styling (for templates with text) */}
            {contentEnabled && (
              <div className="space-y-4">
                {/* Title Styling */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold">Title Style</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Size (px)</Label>
                      <Input type="number" min={12} max={120}
                        value={config.titleStyle?.fontSize ?? 48}
                        onChange={(e) => setConfig(prev => ({ ...prev, titleStyle: { ...prev.titleStyle, fontSize: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (px)</Label>
                      <Input type="number" min={12} max={150}
                        value={config.titleStyle?.lineHeight ?? 56}
                        onChange={(e) => setConfig(prev => ({ ...prev, titleStyle: { ...prev.titleStyle, lineHeight: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spacing (px)</Label>
                      <Input type="number" min={-5} max={20} step={0.5}
                        value={config.titleStyle?.letterSpacing ?? 0}
                        onChange={(e) => setConfig(prev => ({ ...prev, titleStyle: { ...prev.titleStyle, letterSpacing: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input type="color"
                        value={config.titleStyle?.color || '#ffffff'}
                        onChange={(e) => setConfig(prev => ({ ...prev, titleStyle: { ...prev.titleStyle, color: e.target.value } }))}
                        className="h-10 p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtitle Styling */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold">Subtitle Style</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Size (px)</Label>
                      <Input type="number" min={10} max={60}
                        value={config.subtitleStyle?.fontSize ?? 14}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, fontSize: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (px)</Label>
                      <Input type="number" min={10} max={80}
                        value={config.subtitleStyle?.lineHeight ?? 20}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, lineHeight: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spacing (px)</Label>
                      <Input type="number" min={-2} max={20} step={0.5}
                        value={config.subtitleStyle?.letterSpacing ?? 2}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, letterSpacing: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input type="color"
                        value={config.subtitleStyle?.color || '#cccccc'}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, color: e.target.value } }))}
                        className="h-10 p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Description Styling */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold">Description Style</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Size (px)</Label>
                      <Input type="number" min={10} max={40}
                        value={config.descriptionStyle?.fontSize ?? 18}
                        onChange={(e) => setConfig(prev => ({ ...prev, descriptionStyle: { ...prev.descriptionStyle, fontSize: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (px)</Label>
                      <Input type="number" min={10} max={60}
                        value={config.descriptionStyle?.lineHeight ?? 28}
                        onChange={(e) => setConfig(prev => ({ ...prev, descriptionStyle: { ...prev.descriptionStyle, lineHeight: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spacing (px)</Label>
                      <Input type="number" min={-2} max={10} step={0.5}
                        value={config.descriptionStyle?.letterSpacing ?? 0}
                        onChange={(e) => setConfig(prev => ({ ...prev, descriptionStyle: { ...prev.descriptionStyle, letterSpacing: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input type="color"
                        value={config.descriptionStyle?.color || '#aaaaaa'}
                        onChange={(e) => setConfig(prev => ({ ...prev, descriptionStyle: { ...prev.descriptionStyle, color: e.target.value } }))}
                        className="h-10 p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cutout Image (for cut-out template) */}
            {selectedType === 'cut-out' && (
              <div className="space-y-3">
                <Label>Cutout Image (Transparent PNG)</Label>
                {config.cutoutImage ? (
                  <div className="relative rounded-lg overflow-hidden bg-muted p-4">
                    <img 
                      src={config.cutoutImage} 
                      alt="Cutout" 
                      className="h-40 mx-auto object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setConfig(prev => ({ ...prev, cutoutImage: undefined }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      id="hero-cutout-upload"
                      onChange={(e) => handleImageUpload(e, 'cutoutImage')}
                    />
                    <label htmlFor="hero-cutout-upload" className="cursor-pointer">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Scissors className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Upload transparent PNG
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
