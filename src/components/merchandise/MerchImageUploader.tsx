import { useState, useCallback } from 'react';
import { X, Upload, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimization';
import { toast } from 'sonner';

interface MerchImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function MerchImageUploader({ images, onChange, maxImages = 7 }: MerchImageUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    if (filesToUpload.length < files.length) {
      toast.info(`Only uploading ${filesToUpload.length} of ${files.length} — max ${maxImages} images`);
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const optimized = await optimizeImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.85,
          outputFormat: 'image/jpeg',
        });

        const ext = optimized.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from('merch-images')
          .upload(path, optimized, { cacheControl: '31536000', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('merch-images')
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} image${newUrls.length > 1 ? 's' : ''} uploaded`);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload image');
      // Still add any successfully uploaded images
      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  }, [images, maxImages, onChange, user]);

  const removeImage = useCallback((index: number) => {
    onChange(images.filter((_, i) => i !== index));
  }, [images, onChange]);

  const moveImage = useCallback((from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const updated = [...images];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onChange(updated);
  }, [images, onChange]);

  return (
    <div className="space-y-2">
      <Label>Product Images ({images.length}/{maxImages})</Label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden border border-border group bg-muted"
            >
              <img
                src={url}
                alt={`Product image ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                  Primary
                </span>
              )}
              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveImage(i, 0)}
                    title="Set as primary"
                  >
                    <span className="text-[10px] font-bold">1st</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeImage(i)}
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger */}
      {images.length < maxImages && (
        <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Click to upload {images.length === 0 ? 'images' : 'more'}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
