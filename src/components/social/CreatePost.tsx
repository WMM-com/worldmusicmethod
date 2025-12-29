import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Globe, Users, Image, Video, Music, X, Upload, Loader2, Megaphone, RefreshCw, Star, Music2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePost } from '@/hooks/useSocial';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type MediaType = 'image' | 'video' | 'audio' | null;
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
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [showUpload, setShowUpload] = useState<MediaType>(null);
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
      folder: `posts/${showUpload}`,
      imageOptimization: showUpload === 'image' ? 'feed' : undefined,
      trackInDatabase: true,
      altText: `Post ${showUpload}`,
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
      // Toggle off - only reset if same type clicked
      setShowUpload(null);
      setMediaUrl('');
      setMediaType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // Switch to new type
      setMediaUrl('');
      setMediaType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUpload(type);
    }
  };

  const handleSubmit = () => {
    const config = POST_TYPE_CONFIG[postType];
    if (!content.trim()) return;
    if (config.requiresVerification && !verified) return;
    
    createPostMutation.mutate(
      { 
        content, 
        mediaUrl: mediaUrl || undefined, 
        mediaType: mediaType || undefined,
        visibility,
        postType,
      },
      {
        onSuccess: () => {
          setContent('');
          setVerified(false);
          handleRemoveMedia();
        },
      }
    );
  };

  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    setVerified(false);
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
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CircularProgress value={progress} size={40} strokeWidth={3} />
                <p className="text-sm text-muted-foreground">
                  Uploading media...
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
                disabled={!content.trim() || (POST_TYPE_CONFIG[postType].requiresVerification && !verified) || createPostMutation.isPending || isUploading}
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
