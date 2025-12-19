import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Users, Image, X, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePost } from '@/hooks/useSocial';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function CreatePost() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('friends');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createPostMutation = useCreatePost();
  const { uploadFile, isUploading, progress } = useR2Upload();

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: 'posts',
      imageOptimization: 'feed',
      trackInDatabase: true,
      altText: 'Post image',
    });

    if (result) {
      setImageUrl(result.url);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPostMutation.mutate(
      { content, imageUrl: imageUrl || undefined, visibility },
      {
        onSuccess: () => {
          setContent('');
          setImageUrl('');
          setShowImageUpload(false);
        },
      }
    );
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share something with your network..."
              rows={3}
              className="resize-none"
            />
            
            {/* Image preview */}
            {imageUrl && (
              <div className="relative inline-block">
                <img 
                  src={imageUrl} 
                  alt="Upload preview" 
                  className="max-h-48 rounded-lg object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading... {progress}%
                </p>
              </div>
            )}
            
            {/* Image upload area */}
            {showImageUpload && !imageUrl && !isUploading && (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload an image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF up to 10MB
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowImageUpload(!showImageUpload);
                    if (showImageUpload) {
                      handleRemoveImage();
                    }
                  }}
                  className={showImageUpload || imageUrl ? 'text-primary' : ''}
                  disabled={isUploading}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Image
                </Button>
                
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Friends
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createPostMutation.isPending || isUploading}
              >
                {createPostMutation.isPending ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
