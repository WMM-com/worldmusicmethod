import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageCropper } from '@/components/ui/image-cropper';
import { useUploadAvatar } from '@/hooks/useProfile';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useUpdateExtendedProfile, ExtendedProfile } from '@/hooks/useProfilePortfolio';
import { 
  User, Camera, Globe, MapPin, ExternalLink, 
  Facebook, Instagram, Youtube, Music2 
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: ExtendedProfile;
  isOwnProfile: boolean;
  createdAt?: string;
}

export function ProfileHeader({ profile, isOwnProfile, createdAt }: ProfileHeaderProps) {
  const [coverCropperOpen, setCoverCropperOpen] = useState(false);
  const [avatarCropperOpen, setAvatarCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const uploadAvatar = useUploadAvatar();
  const { uploadFile } = useR2Upload();
  const updateProfile = useUpdateExtendedProfile();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropType(type);
      if (type === 'avatar') {
        setAvatarCropperOpen(true);
      } else {
        setCoverCropperOpen(true);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (cropType === 'avatar') {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      await uploadAvatar.mutateAsync(file);
    } else {
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      const result = await uploadFile(file, {
        bucket: 'user',
        folder: 'covers',
        imageOptimization: 'media',
        trackInDatabase: true,
        altText: `${profile.full_name}'s cover image`,
      });
      if (result) {
        await updateProfile.mutateAsync({ cover_image_url: result.url });
      }
    }
    URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc('');
  };

  const socialIcons: Record<string, React.ElementType> = {
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube,
    spotify: Music2,
  };

  return (
    <div className="relative">
      {/* Cover Image */}
      <div 
        className="h-48 sm:h-64 bg-gradient-to-r from-primary/20 to-accent/20 relative overflow-hidden"
        style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {isOwnProfile && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4"
              onClick={() => coverInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              {profile.cover_image_url ? 'Change Cover' : 'Add Cover'}
            </Button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'cover')}
            />
          </>
        )}
      </div>

      {/* Profile Info */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-end">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              className={`h-32 w-32 sm:h-40 sm:w-40 border-4 border-background shadow-lg ${isOwnProfile ? 'cursor-pointer' : ''}`}
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
            >
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-muted">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'avatar')}
                />
              </>
            )}
          </div>

           {/* Name & Info */}
           <div className="flex-1 text-center sm:text-left pb-4">
             <h1 className="text-2xl sm:text-3xl font-bold">
               {profile.full_name || profile.business_name || 'Unnamed'}
             </h1>
             
             {/* Joined date - fetched from backend */}
             {createdAt && (
               <p className="text-sm text-muted-foreground mt-1">
                 Joined in {format(new Date(createdAt), 'MMM yyyy')}
               </p>
             )}
             
             {profile.tagline && (
               <p className="text-lg text-muted-foreground mt-1">{profile.tagline}</p>
             )}
             
             <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
               {profile.profile_type && (
                 <Badge variant="secondary" className="capitalize">
                   {profile.profile_type}
                 </Badge>
               )}
               {profile.is_public && (
                 <Badge variant="outline">
                   <Globe className="h-3 w-3 mr-1" />
                   Public
                 </Badge>
               )}
             </div>

            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                {Object.entries(profile.social_links).map(([platform, url]) => {
                  if (!url) return null;
                  const Icon = socialIcons[platform] || ExternalLink;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tip Jar */}
          {profile.tip_jar_enabled && profile.paypal_email && (
            <div className="pb-4">
              <a
                href={`https://paypal.me/${profile.paypal_email}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" className="gap-2">
                  💰 Support
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Image Croppers */}
      <ImageCropper
        open={avatarCropperOpen}
        onClose={() => {
          setAvatarCropperOpen(false);
          URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc('');
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
        title="Crop Profile Picture"
      />
      <ImageCropper
        open={coverCropperOpen}
        onClose={() => {
          setCoverCropperOpen(false);
          URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc('');
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={16/9}
        circularCrop={false}
        title="Crop Cover Image"
      />
    </div>
  );
}
