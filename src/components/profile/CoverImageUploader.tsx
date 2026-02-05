import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Camera, Loader2, AlertTriangle } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CoverImageUploaderProps {
  currentCoverUrl?: string | null;
  hasHeroConfigured: boolean;
  onUpload: (url: string) => Promise<void>;
  onReplaceHero: () => Promise<void>;
}

export function CoverImageUploader({ 
  currentCoverUrl, 
  hasHeroConfigured,
  onUpload,
  onReplaceHero,
}: CoverImageUploaderProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { uploadFile, isUploading } = useR2Upload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If hero is configured, show confirmation
    if (hasHeroConfigured) {
      setPendingFile(file);
      setShowConfirmDialog(true);
    } else {
      // No hero configured, just upload
      processUpload(file);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const processUpload = async (file: File) => {
    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'covers',
      imageOptimization: 'media',
      trackInDatabase: true,
    });

    if (result) {
      await onUpload(result.url);
      toast.success('Cover image uploaded');
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingFile) return;

    // First clear the hero settings
    await onReplaceHero();

    // Then upload the cover image
    await processUpload(pendingFile);

    setPendingFile(null);
    setShowConfirmDialog(false);
  };

  const handleCancel = () => {
    setPendingFile(null);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
          {currentCoverUrl ? 'Change Cover Image' : 'Add Cover Image'}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Replace Hero Section?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You currently have a customized hero section configured. Adding a cover image will replace your hero section with a simple cover image display.
              <br /><br />
              This action cannot be undone. Your hero settings (title, subtitle, background) will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Yes, Replace Hero'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
