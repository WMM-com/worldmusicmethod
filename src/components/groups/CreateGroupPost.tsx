import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Image, Video, Music, X, Upload, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroupPost } from '@/hooks/useGroups';
import { useR2Upload } from '@/hooks/useR2Upload';

type MediaType = 'image' | 'video' | 'audio' | null;

interface CreateGroupPostProps {
  groupId: string;
  channelId?: string | null;
  allowImages?: boolean;
  allowAudio?: boolean;
}

export function CreateGroupPost({ groupId, channelId, allowImages = true, allowAudio = true }: CreateGroupPostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [showUpload, setShowUpload] = useState<MediaType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPostMutation = useCreateGroupPost();
  const { uploadFile, isUploading, progress } = useR2Upload();

  const getAcceptType = (type: MediaType) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      default: return '*/*';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !showUpload) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: `groups/${groupId}/${showUpload}`,
      imageOptimization: showUpload === 'image' ? 'feed' : undefined,
      trackInDatabase: true,
      altText: `Group post ${showUpload}`,
    });

    if (result) {
      setMediaUrl(result.url);
      setMediaType(showUpload);
    }
  };

  const handleRemoveMedia = () => {
    setMediaUrl('');
    setMediaType(null);
    setShowUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = (type: MediaType) => {
    if (showUpload === type) {
      setShowUpload(null);
      setMediaUrl('');
      setMediaType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setMediaUrl('');
      setMediaType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUpload(type);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !mediaUrl) return;
    
    createPostMutation.mutate(
      { 
        group_id: groupId,
        channel_id: channelId || undefined,
        content: content.trim() || (mediaUrl ? `[${mediaType}]` : ''),
        media_url: mediaUrl || undefined, 
        media_type: mediaType || undefined,
      },
      {
        onSuccess: () => {
          setContent('');
          handleRemoveMedia();
        },
      }
    );
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the group..."
            rows={3}
            className="resize-none"
          />
          
          {/* Media preview */}
          {mediaUrl && (
            <div className="relative inline-block">
              {mediaType === 'image' && (
                <img 
                  src={mediaUrl} 
                  alt="Upload preview" 
                  className="max-h-48 rounded-lg object-cover"
                />
              )}
              {mediaType === 'video' && (
                <video 
                  src={mediaUrl} 
                  controls 
                  className="max-h-48 rounded-lg"
                />
              )}
              {mediaType === 'audio' && (
                <audio src={mediaUrl} controls className="w-full" />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={handleRemoveMedia}
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
          
          {/* Upload area */}
          {showUpload && !mediaUrl && !isUploading && (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload {showUpload === 'image' ? 'an image' : showUpload === 'video' ? 'a video' : 'audio'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {showUpload === 'image' && 'JPG, PNG, GIF up to 10MB'}
                {showUpload === 'video' && 'MP4, WebM up to 100MB'}
                {showUpload === 'audio' && 'MP3, WAV, M4A up to 50MB'}
              </p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptType(showUpload)}
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {allowImages && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUploadClick('image')}
                    className={showUpload === 'image' || mediaType === 'image' ? 'text-primary' : ''}
                    disabled={isUploading}
                  >
                    <Image className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Image</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUploadClick('video')}
                    className={showUpload === 'video' || mediaType === 'video' ? 'text-primary' : ''}
                    disabled={isUploading}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Video</span>
                  </Button>
                </>
              )}
              {allowAudio && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('audio')}
                  className={showUpload === 'audio' || mediaType === 'audio' ? 'text-primary' : ''}
                  disabled={isUploading}
                >
                  <Music className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Audio</span>
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && !mediaUrl) || createPostMutation.isPending || isUploading}
            >
              <Send className="h-4 w-4 mr-2" />
              {createPostMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}