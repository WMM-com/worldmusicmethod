import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { toast } from 'sonner';

interface GroupCoverUploadProps {
  groupId: string;
  currentCoverUrl: string | null;
  onUpload: (url: string) => void;
}

export function GroupCoverUpload({ groupId, currentCoverUrl, onUpload }: GroupCoverUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useR2Upload();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    const result = await uploadFile(file, {
      bucket: 'user',
      folder: `groups/${groupId}`,
      imageOptimization: 'feed',
      trackInDatabase: true,
      altText: 'Group cover image',
    });
    
    if (result?.url) {
      onUpload(result.url);
      toast.success('Cover image uploaded!');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="relative group">
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative overflow-hidden rounded-t-lg">
        {currentCoverUrl ? (
          <img src={currentCoverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">No cover image</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Upload Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress}%
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Change Cover
              </>
            )}
          </Button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
