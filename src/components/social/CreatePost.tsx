import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Users, Image, Video, Music, X, Upload, Loader2, Megaphone, RefreshCw, Star, Music2, Lock, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePost } from '@/hooks/useSocial';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MentionInput } from '@/components/ui/mention-input';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type MediaType = 'image' | 'video' | 'audio' | null;
type MediaItem = { url: string; type: 'image' | 'video' | 'audio' };
type PostType = 'statement' | 'update' | 'recommendation' | 'practice';

const POST_TYPE_CONFIG = {
  statement: {
    label: 'Statement',
    icon: Megaphone,
    verification: 'This represents my current beliefs and is worth posting',
    color: 'border-l-primary',
    buttonColor: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    requiresVerification: true,
    description: null,
  },
  update: {
    label: 'Update',
    icon: RefreshCw,
    verification: 'This update is relevant for people to see',
    color: 'border-l-accent',
    buttonColor: 'bg-accent hover:bg-accent/90 text-accent-foreground',
    requiresVerification: true,
    description: null,
  },
  recommendation: {
    label: 'Recommendation',
    icon: Star,
    verification: 'I recommend that this is worth checking out',
    color: 'border-l-secondary',
    buttonColor: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
    requiresVerification: true,
    description: null,
  },
  practice: {
    label: 'Practice Room',
    icon: Music2,
    verification: null,
    color: 'border-l-success',
    buttonColor: 'bg-success hover:bg-success/90 text-success-foreground',
    requiresVerification: false,
    description: 'This is what I\'m working on',
  },
};

export function CreatePost() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [postType, setPostType] = useState<PostType>('update');
  const [verified, setVerified] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showUpload, setShowUpload] = useState<MediaType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPostMutation = useCreatePost();
  const { uploadFile, isUploading, progress } = useR2Upload();
  const [uploadingCount, setUploadingCount] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-visibility', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, visibility')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Check if user has a private profile
  const isPrivateProfile = profile?.visibility === 'private';

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const getAcceptType = (type: MediaType) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      default: return '*/*';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !showUpload) return;

    // For images, allow multiple; for video/audio, only one
    const filesToUpload = showUpload === 'image' ? Array.from(files) : [files[0]];
    
    // Limit to 10 images
    const maxImages = 10;
    const currentImageCount = mediaItems.filter(m => m.type === 'image').length;
    const allowedFiles = showUpload === 'image' 
      ? filesToUpload.slice(0, maxImages - currentImageCount)
      : filesToUpload;

    if (allowedFiles.length === 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploadingCount(prev => prev + allowedFiles.length);

    for (const file of allowedFiles) {
      const result = await uploadFile(file, {
        bucket: 'user',
        folder: `posts/${showUpload}`,
        imageOptimization: showUpload === 'image' ? 'feed' : undefined,
        trackInDatabase: true,
        altText: `Post ${showUpload}`,
      });

      if (result) {
        setMediaItems(prev => [...prev, { url: result.url, type: showUpload as 'image' | 'video' | 'audio' }]);
      }
      setUploadingCount(prev => prev - 1);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllMedia = () => {
    setMediaItems([]);
    setShowUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = (type: MediaType) => {
    if (type === 'image') {
      // For images, always allow adding more (up to limit)
      setShowUpload('image');
      // Clear any non-image media when switching to images
      setMediaItems(prev => prev.filter(m => m.type === 'image'));
    } else if (showUpload === type) {
      // Toggle off - only reset if same type clicked
      setShowUpload(null);
    } else {
      // Switch to video/audio - clear all existing media
      setMediaItems([]);
      setShowUpload(type);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Determine current media type for display
  const currentMediaType = mediaItems.length > 0 ? mediaItems[0].type : null;

  const handleSubmit = () => {
    const config = POST_TYPE_CONFIG[postType];
    if (!content.trim()) return;
    if (config.requiresVerification && !verified) return;
    
    // For multiple images, store as JSON array in image_url
    // For single media, store the URL directly
    let mediaUrl: string | undefined;
    let mediaType: 'image' | 'video' | 'audio' | undefined;
    
    if (mediaItems.length > 0) {
      if (mediaItems.length === 1) {
        mediaUrl = mediaItems[0].url;
        mediaType = mediaItems[0].type;
      } else {
        // Multiple images - store as JSON array
        mediaUrl = JSON.stringify(mediaItems.map(m => m.url));
        mediaType = 'image';
      }
    }
    
    createPostMutation.mutate(
      { 
        content, 
        mediaUrl,
        mediaType,
        visibility,
        postType,
      },
      {
        onSuccess: () => {
          setContent('');
          setVerified(false);
          handleClearAllMedia();
        },
      }
    );
  };

  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    setVerified(false);
  };

  if (!user) return null;

  // Don't allow private profiles to post
  if (isPrivateProfile) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-3 text-muted-foreground">
            <Lock className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">Your profile is private</p>
              <p className="text-sm break-words">
                Change your profile visibility to "Members Only" or "Public" in{' '}
                <Link to="/account?section=profile" className="text-primary underline">Account Settings</Link>{' '}
                to post and comment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder="Share something with your network... Use @ to mention someone"
              rows={3}
              className="resize-none"
            />
            
            {/* Media preview */}
            {mediaItems.length > 0 && (
              <div className="space-y-2">
                {/* Image grid for multiple images */}
                {currentMediaType === 'image' && (
                  <div className={`grid gap-2 ${
                    mediaItems.length === 1 ? 'grid-cols-1' : 
                    mediaItems.length === 2 ? 'grid-cols-2' : 
                    mediaItems.length === 3 ? 'grid-cols-3' : 
                    'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  }`}>
                    {mediaItems.map((item, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img 
                          src={item.url} 
                          alt={`Upload preview ${index + 1}`} 
                          className="w-full h-full rounded-lg object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMedia(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {/* Add more images button */}
                    {mediaItems.length < 10 && (
                      <div 
                        className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Video preview */}
                {currentMediaType === 'video' && mediaItems[0] && (
                  <div className="relative inline-block">
                    <video 
                      src={mediaItems[0].url} 
                      controls 
                      className="max-h-48 rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleRemoveMedia(0)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Audio preview */}
                {currentMediaType === 'audio' && mediaItems[0] && (
                  <div className="relative">
                    <audio src={mediaItems[0].url} controls className="w-full" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-6 w-6"
                      onClick={() => handleRemoveMedia(0)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Upload progress */}
            {(isUploading || uploadingCount > 0) && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CircularProgress value={progress} size={40} strokeWidth={3} />
                <p className="text-sm text-muted-foreground">
                  Uploading media{uploadingCount > 1 ? ` (${uploadingCount} remaining)` : ''}...
                </p>
              </div>
            )}
            
            {/* Upload area - show when upload type selected and no media yet (or images can add more) */}
            {showUpload && mediaItems.length === 0 && !isUploading && uploadingCount === 0 && (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload {showUpload === 'image' ? 'images (up to 10)' : showUpload === 'video' ? 'a video' : 'audio'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {showUpload === 'image' && 'JPG, PNG, GIF up to 10MB each'}
                  {showUpload === 'video' && 'MP4, WebM up to 100MB'}
                  {showUpload === 'audio' && 'MP3, WAV, M4A up to 50MB'}
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptType(showUpload)}
              multiple={showUpload === 'image'}
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {/* Post Type Selection */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => {
                const config = POST_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={postType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePostTypeChange(type)}
                    className={postType === type ? config.buttonColor + ' gap-1 px-2' : 'gap-1 px-2'}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {/* Verification Checkbox - only for types that require it */}
            {POST_TYPE_CONFIG[postType].requiresVerification && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Checkbox 
                  id="verify" 
                  checked={verified} 
                  onCheckedChange={(checked) => setVerified(checked === true)}
                />
                <Label 
                  htmlFor="verify" 
                  className="text-sm leading-relaxed cursor-pointer text-muted-foreground"
                >
                  {POST_TYPE_CONFIG[postType].verification}
                </Label>
              </div>
            )}

            {/* Description text for Practice Room (no checkbox needed) */}
            {POST_TYPE_CONFIG[postType].description && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  {POST_TYPE_CONFIG[postType].description}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('image')}
                  className={showUpload === 'image' || currentMediaType === 'image' ? 'text-primary' : ''}
                  disabled={isUploading || uploadingCount > 0}
                >
                  <Image className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Image{mediaItems.length > 0 && currentMediaType === 'image' ? ` (${mediaItems.length})` : ''}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('video')}
                  className={showUpload === 'video' || currentMediaType === 'video' ? 'text-primary' : ''}
                  disabled={isUploading || uploadingCount > 0}
                >
                  <Video className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Video</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('audio')}
                  className={showUpload === 'audio' || currentMediaType === 'audio' ? 'text-primary' : ''}
                  disabled={isUploading || uploadingCount > 0}
                >
                  <Music className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Audio</span>
                </Button>
                
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-28 h-8 ml-2">
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
                disabled={!content.trim() || (POST_TYPE_CONFIG[postType].requiresVerification && !verified) || createPostMutation.isPending || isUploading || uploadingCount > 0}
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
