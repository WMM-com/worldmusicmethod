import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { useR2Upload } from '@/hooks/useR2Upload';
import { 
  Image as ImageIcon, EllipsisVertical, Trash2, Upload, Loader2, X, Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function ImageBlock({ section, isEditing, onUpdate, onDelete }: ImageBlockProps) {
  const content = section.content as {
    imageUrl?: string;
    alt?: string;
    width?: number;
    height?: number;
    opacity?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
  };

  const [localContent, setLocalContent] = useState(content);
  const [inlineEdit, setInlineEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useR2Upload();

  const handleSave = () => {
    onUpdate(localContent);
    setInlineEdit(false);
    toast.success('Image settings saved');
  };

  const handleChange = (field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'profile-images',
      imageOptimization: 'media',
      trackInDatabase: true,
    });

    if (result) {
      setLocalContent(prev => ({ ...prev, imageUrl: result.url }));
      toast.success('Image uploaded');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showEditMode = isEditing || inlineEdit;

  // View mode with hover pencil
  if (!showEditMode) {
    if (!localContent.imageUrl) return null;
    
    return (
      <div className="relative group">
        <img
          src={localContent.imageUrl}
          alt={localContent.alt || 'Image'}
          style={{
            width: localContent.width ? `${localContent.width}px` : '100%',
            height: localContent.height ? `${localContent.height}px` : 'auto',
            opacity: (localContent.opacity ?? 100) / 100,
            borderRadius: `${localContent.borderRadius || 0}px`,
            borderWidth: `${localContent.borderWidth || 0}px`,
            borderColor: localContent.borderColor || 'transparent',
            borderStyle: localContent.borderWidth ? 'solid' : 'none',
            objectFit: localContent.objectFit || 'cover',
          }}
          className="w-full"
        />
        {/* Hover edit button - only visible to owners in edit mode */}
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setInlineEdit(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <Card className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-3 space-y-4">
              <div>
                <Label className="text-xs">Width (px, 0 = auto)</Label>
                <Input
                  type="number"
                  value={localContent.width || ''}
                  onChange={(e) => handleChange('width', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
              <div>
                <Label className="text-xs">Height (px, 0 = auto)</Label>
                <Input
                  type="number"
                  value={localContent.height || ''}
                  onChange={(e) => handleChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
              <div>
                <Label className="text-xs">Opacity: {localContent.opacity ?? 100}%</Label>
                <Slider
                  value={[localContent.opacity ?? 100]}
                  onValueChange={([v]) => handleChange('opacity', v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
              <div>
                <Label className="text-xs">Border Radius: {localContent.borderRadius || 0}px</Label>
                <Slider
                  value={[localContent.borderRadius || 0]}
                  onValueChange={([v]) => handleChange('borderRadius', v)}
                  min={0}
                  max={50}
                  step={2}
                />
              </div>
              <div>
                <Label className="text-xs">Border Width: {localContent.borderWidth || 0}px</Label>
                <Slider
                  value={[localContent.borderWidth || 0]}
                  onValueChange={([v]) => handleChange('borderWidth', v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          Image Block
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {localContent.imageUrl ? (
          <div className="relative">
            <img
              src={localContent.imageUrl}
              alt={localContent.alt || 'Preview'}
              className="w-full h-48 object-cover rounded-md border"
              style={{
                opacity: (localContent.opacity ?? 100) / 100,
                borderRadius: `${localContent.borderRadius || 8}px`,
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => handleChange('imageUrl', '')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full h-32"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        )}

        <div>
          <Label className="text-xs">Alt Text</Label>
          <Input
            value={localContent.alt || ''}
            onChange={(e) => handleChange('alt', e.target.value)}
            placeholder="Describe the image..."
          />
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
