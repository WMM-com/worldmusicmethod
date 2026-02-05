import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Scissors
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
    description: 'Full background image with text overlay',
    icon: Image
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

export function HeroEditor({ heroType, heroConfig, onSave, trigger }: HeroEditorProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<HeroType>(heroType || 'standard');
  const [config, setConfig] = useState<HeroConfig>(heroConfig || {});
  const { uploadFile, isUploading, progress } = useR2Upload();

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
    toast.success('Hero section updated');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <TabsTrigger value="content">Content</TabsTrigger>
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

          {/* Content */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Your Name or Brand"
              />
            </div>

            <div className="space-y-3">
              <Label>Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Musician • Producer • Artist"
              />
            </div>

            <div className="space-y-3">
              <Label>Description</Label>
              <Textarea
                value={config.description || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A brief introduction..."
                rows={3}
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

            {/* Background Image (for standard & cut-out) */}
            {(selectedType === 'standard' || selectedType === 'cut-out') && (
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
