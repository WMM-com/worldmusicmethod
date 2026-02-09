import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ImageCropper } from '@/components/ui/image-cropper';
import { 
  useProfileGallery, 
  useAddGalleryItem, 
  useDeleteGalleryItem,
  GalleryItem 
} from '@/hooks/useProfilePortfolio';
import { useR2Upload } from '@/hooks/useR2Upload';
import { Images, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GallerySectionProps {
  section?: any;
  userId: string;
  isEditing: boolean;
  onUpdate?: (content: Record<string, any>) => void;
  onDelete?: () => void;
}

export function GallerySection({ section, userId, isEditing, onUpdate, onDelete }: GallerySectionProps) {
  const { data: gallery = [] } = useProfileGallery(userId);
  const addItem = useAddGalleryItem();
  const deleteItem = useDeleteGalleryItem();
  const { uploadFile, isUploading } = useR2Upload();
  
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropperOpen(true);
    }
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'gallery.jpg', { type: 'image/jpeg' });
    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'gallery',
      imageOptimization: 'media',
      trackInDatabase: true,
    });
    if (result) {
      await addItem.mutateAsync({ image_url: result.url });
    }
    URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc('');
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  if (!gallery.length && !isEditing) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Images className="h-5 w-5" />
            Gallery
          </CardTitle>
          {isEditing && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Image
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {gallery.map((item, index) => (
                <div key={item.id} className="relative group aspect-square">
                  <img
                    src={item.image_url}
                    alt={item.caption || 'Gallery image'}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => openLightbox(index)}
                  />
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-7 w-7 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteItem.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No images in gallery yet
            </p>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <ImageCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc('');
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title="Crop Gallery Image"
      />

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Gallery Image</DialogTitle>
          <div className="relative aspect-square sm:aspect-video flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {gallery.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            
            {gallery[currentIndex] && (
              <img
                src={gallery[currentIndex].image_url}
                alt={gallery[currentIndex].caption || 'Gallery image'}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
