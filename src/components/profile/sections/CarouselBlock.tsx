import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Pencil, Check, X, Plus, Trash2, Upload } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { toast } from 'sonner';

interface CarouselImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface CarouselBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function CarouselBlock({ section, isEditing, onUpdate }: CarouselBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const { uploadFile } = useR2Upload();
  const content = section.content || {};
  
  const images: CarouselImage[] = content.images || [
    { url: '/placeholder.svg', alt: 'Slide 1', caption: 'First slide' },
    { url: '/placeholder.svg', alt: 'Slide 2', caption: 'Second slide' },
    { url: '/placeholder.svg', alt: 'Slide 3', caption: 'Third slide' }
  ];
  const showCaptions = content.showCaptions !== false;
  const autoPlay = content.autoPlay || false;
  const aspectRatio = content.aspectRatio || '16:9';

  const [editState, setEditState] = useState({
    images,
    showCaptions,
    autoPlay,
    aspectRatio
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateImage = (index: number, field: keyof CarouselImage, value: string) => {
    const updated = [...editState.images];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, images: updated }));
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const result = await uploadFile(file, { bucket: 'user', folder: 'profile-carousel' });
      if (result?.url) {
        updateImage(index, 'url', result.url);
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingIndex(null);
    }
  };

  const addImage = () => {
    setEditState(s => ({
      ...s,
      images: [...s.images, { url: '/placeholder.svg', alt: 'New slide' }]
    }));
  };

  const removeImage = (index: number) => {
    if (editState.images.length <= 1) return;
    setEditState(s => ({
      ...s,
      images: s.images.filter((_, i) => i !== index)
    }));
  };

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '21:9': 'aspect-[21/9]'
  }[aspectRatio] || 'aspect-video';

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Carousel</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Aspect Ratio</Label>
              <Select value={editState.aspectRatio} onValueChange={(v) => setEditState(s => ({ ...s, aspectRatio: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showCaptions"
                  checked={editState.showCaptions}
                  onChange={(e) => setEditState(s => ({ ...s, showCaptions: e.target.checked }))}
                />
                <Label htmlFor="showCaptions">Show captions</Label>
              </div>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoPlay"
                  checked={editState.autoPlay}
                  onChange={(e) => setEditState(s => ({ ...s, autoPlay: e.target.checked }))}
                />
                <Label htmlFor="autoPlay">Auto-play</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {editState.images.map((img, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Slide {index + 1}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => removeImage(index)}
                    disabled={editState.images.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex gap-3">
                  <div className="w-24 h-16 bg-muted rounded overflow-hidden shrink-0">
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={img.url}
                        onChange={(e) => updateImage(index, 'url', e.target.value)}
                        placeholder="Image URL"
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        disabled={uploadingIndex === index}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(index, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={img.caption || ''}
                      onChange={(e) => updateImage(index, 'caption', e.target.value)}
                      placeholder="Caption (optional)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addImage}>
            <Plus className="h-4 w-4 mr-2" /> Add Slide
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
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((img, index) => (
            <CarouselItem key={index}>
              <div className={`relative ${aspectRatioClass} overflow-hidden rounded-lg`}>
                <img 
                  src={img.url} 
                  alt={img.alt || `Slide ${index + 1}`} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {showCaptions && img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-sm">{img.caption}</p>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
}
