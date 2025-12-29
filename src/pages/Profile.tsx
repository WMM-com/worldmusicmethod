import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUserProfile, useUserPosts, useUserStats, useUpdateBio, useUploadAvatar } from '@/hooks/useProfile';
import { useFriendships, useSendFriendRequest } from '@/hooks/useSocial';
import { useCreateConversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { 
  useExtendedProfile, 
  useUpdateExtendedProfile, 
  useProfileSections, 
  useCreateSection, 
  useUpdateSection, 
  useDeleteSection,
  useReorderSections,
  useProfileGallery
} from '@/hooks/useProfilePortfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/social/PostCard';
import { ImageCropper } from '@/components/ui/image-cropper';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BioSection } from '@/components/profile/sections/BioSection';
import { SpotifyEmbed } from '@/components/profile/sections/SpotifyEmbed';
import { YouTubeEmbed } from '@/components/profile/sections/YouTubeEmbed';
import { SoundCloudEmbed } from '@/components/profile/sections/SoundCloudEmbed';
import { GenericEmbed } from '@/components/profile/sections/GenericEmbed';
import { GallerySection } from '@/components/profile/sections/GallerySection';
import { ProjectsSection } from '@/components/profile/sections/ProjectsSection';
import { EventsEmbed } from '@/components/profile/sections/EventsEmbed';
import { SocialFeedEmbed } from '@/components/profile/sections/SocialFeedEmbed';
import { CustomTabsSection } from '@/components/profile/sections/CustomTabsSection';
import { 
  User, Camera, Edit2, MessageSquare, UserPlus, Check, Users, FileText, 
  Settings, Eye, EyeOff, Plus, GripVertical, Music, Video, Image, 
  Calendar, Share2, Layout, DollarSign, Globe, Lock, Headphones, Code,
  Newspaper, UsersRound, UserSearch
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Sidebar embed sections (right side)
const SIDEBAR_SECTION_TYPES = [
  { type: 'youtube', label: 'YouTube', icon: Video },
  { type: 'spotify', label: 'Spotify', icon: Music },
  { type: 'soundcloud', label: 'SoundCloud', icon: Headphones },
  { type: 'generic', label: 'Other Embed', icon: Code },
];

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwnProfile = !userId || userId === user?.id;
  const profileId = userId || user?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(profileId);
  const { data: extendedProfile } = useExtendedProfile(profileId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(profileId!);
  const { data: stats } = useUserStats(profileId!);
  const { data: friendships } = useFriendships();
  const { data: sections, isLoading: sectionsLoading } = useProfileSections(profileId);
  
  const updateBio = useUpdateBio();
  const uploadAvatar = useUploadAvatar();
  const sendFriendRequest = useSendFriendRequest();
  const createConversation = useCreateConversation();
  const updateExtendedProfile = useUpdateExtendedProfile();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();

  const [isEditing, setIsEditing] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isFriend = friendships?.friends.some(
    f => f.user_id === profileId || f.friend_id === profileId
  );
  const hasPendingRequest = friendships?.pending.some(
    f => f.friend_id === profileId
  );

  const handleAvatarClick = () => {
    if (isOwnProfile && isEditing) {
      setCropType('avatar');
      fileInputRef.current?.click();
    }
  };

  const handleCoverClick = () => {
    if (isOwnProfile && isEditing) {
      setCropType('cover');
      coverInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropType(type);
      setCropperOpen(true);
    }
    if (type === 'avatar' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (type === 'cover' && coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const { uploadFile } = useR2Upload();
  
  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `${cropType}.jpg`, { type: 'image/jpeg' });
    if (cropType === 'avatar') {
      await uploadAvatar.mutateAsync(file);
    } else {
      // Upload cover image to R2 and update profile
      const result = await uploadFile(file, {
        bucket: 'user',
        folder: 'covers',
        imageOptimization: 'media',
        trackInDatabase: true,
        altText: `Cover image`,
      });
      if (result) {
        await updateExtendedProfile.mutateAsync({ cover_image_url: result.url });
        toast.success('Cover image updated');
      }
    }
    URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc('');
  };

  const handleMessage = async () => {
    if (!profileId) return;
    const conversationId = await createConversation.mutateAsync(profileId);
    navigate('/messages', { state: { conversationId } });
  };

  const handleTogglePublic = async () => {
    await updateExtendedProfile.mutateAsync({ 
      is_public: !extendedProfile?.is_public 
    });
    toast.success(extendedProfile?.is_public ? 'Profile is now private' : 'Profile is now public');
  };

  const handleAddSection = async (sectionType: string) => {
    const sectionLabels: Record<string, string> = {
      spotify: 'Music',
      youtube: 'Videos',
      soundcloud: 'SoundCloud',
      gallery: 'Gallery',
      events: 'Events',
      social_feed: 'Social',
      projects: 'Projects',
      custom_tabs: 'Info',
      generic: 'Embed',
    };
    
    await createSection.mutateAsync({
      section_type: sectionType,
      title: sectionLabels[sectionType] || sectionType,
    });
  };

  const handleUpdateSection = async (sectionId: string, content: Record<string, any>) => {
    await updateSection.mutateAsync({ id: sectionId, content });
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection.mutateAsync(sectionId);
    toast.success('Section removed');
  };

  // Categorize sections for layout
  const mainSections = sections?.filter(s => 
    ['gallery', 'projects', 'custom_tabs', 'social_feed'].includes(s.section_type)
  ) || [];
  
  const sidebarSections = sections?.filter(s => 
    ['youtube', 'spotify', 'soundcloud', 'events', 'generic'].includes(s.section_type)
  ) || [];

  const renderSection = (section: any, isSidebar = false) => {
    const props = {
      section,
      isEditing,
      onUpdate: (content: Record<string, any>) => handleUpdateSection(section.id, content),
      onDelete: () => handleDeleteSection(section.id),
    };

    switch (section.section_type) {
      case 'spotify':
        return <SpotifyEmbed key={section.id} {...props} />;
      case 'youtube':
        return <YouTubeEmbed key={section.id} {...props} isSidebar={isSidebar} />;
      case 'soundcloud':
        return <SoundCloudEmbed key={section.id} {...props} />;
      case 'generic':
        return <GenericEmbed key={section.id} {...props} />;
      case 'gallery':
        return <GallerySection key={section.id} {...props} userId={profileId!} />;
      case 'events':
        return <EventsEmbed key={section.id} {...props} />;
      case 'social_feed':
        return <SocialFeedEmbed key={section.id} {...props} />;
      case 'projects':
        return <ProjectsSection key={section.id} {...props} userId={profileId!} />;
      case 'custom_tabs':
        return <CustomTabsSection key={section.id} {...props} userId={profileId!} />;
      default:
        return null;
    }
  };

  if (profileLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <Skeleton className="h-64 w-full" />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
            <p className="text-muted-foreground">This profile doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background pb-24">
        {/* Community Navigation */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
                <Link 
                  to="/community?tab=feed" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  <Newspaper className="h-4 w-4" />
                  Feed
                </Link>
                <Link 
                  to="/community?tab=friends" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Friends
                </Link>
                <Link 
                  to="/community?tab=members" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  <UserSearch className="h-4 w-4" />
                  Members
                </Link>
                <Link 
                  to="/community?tab=groups" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  <UsersRound className="h-4 w-4" />
                  Groups
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-background text-foreground">
                  <User className="h-4 w-4" />
                  My Profile
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div 
          className={`relative h-48 sm:h-64 md:h-80 bg-gradient-to-r from-primary/20 to-primary/5 ${isEditing ? 'cursor-pointer' : ''}`}
          onClick={handleCoverClick}
          style={extendedProfile?.cover_image_url ? {
            backgroundImage: `url(${extendedProfile.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          {isEditing && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="text-white text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <span>Change Cover</span>
              </div>
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'cover')}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* Profile Header Card - overlapping cover */}
          <div className="-mt-16 sm:-mt-20 relative z-10">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
                  {/* Avatar */}
                  <div className="relative -mt-20 sm:-mt-24">
                    <Avatar
                      className={`h-32 w-32 sm:h-40 sm:w-40 border-4 border-background ${isEditing ? 'cursor-pointer' : ''}`}
                      onClick={handleAvatarClick}
                    >
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-4xl bg-muted">
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-0 right-0 h-10 w-10 rounded-full"
                        onClick={handleAvatarClick}
                      >
                        <Camera className="h-5 w-5" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'avatar')}
                    />
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-center sm:text-left pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-bold">
                        {profile.full_name || 'Anonymous'}
                      </h1>
                      {extendedProfile?.is_public ? (
                        <Badge variant="secondary" className="w-fit mx-auto sm:mx-0">
                          <Globe className="h-3 w-3 mr-1" /> Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit mx-auto sm:mx-0">
                          <Lock className="h-3 w-3 mr-1" /> Private
                        </Badge>
                      )}
                    </div>
                    
                    {extendedProfile?.tagline && (
                      <p className="text-lg text-muted-foreground mb-1">{extendedProfile.tagline}</p>
                    )}
                    
                    {profile.business_name && (
                      <p className="text-muted-foreground mb-2">{profile.business_name}</p>
                    )}
                    
                    {extendedProfile?.username && (
                      <p className="text-sm text-muted-foreground mb-2">@{extendedProfile.username}</p>
                    )}

                    {/* Stats */}
                    <div className="flex gap-6 justify-center sm:justify-start mt-4">
                      <div className="text-center">
                        <span className="font-bold text-lg">{stats?.posts || 0}</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Posts
                        </p>
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-lg">{stats?.friends || 0}</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Friends
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end pb-4">
                    {isOwnProfile ? (
                      <>
                        <Button
                          variant={isEditing ? "default" : "outline"}
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          {isEditing ? (
                            <>
                              <Check className="h-4 w-4 mr-2" /> Done Editing
                            </>
                          ) : (
                            <>
                              <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/settings')}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleMessage} variant="outline">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        {isFriend ? (
                          <Badge variant="secondary" className="h-9 px-3 flex items-center">
                            <Check className="h-4 w-4 mr-1" />
                            Friends
                          </Badge>
                        ) : hasPendingRequest ? (
                          <Badge variant="outline" className="h-9 px-3 flex items-center">
                            Request Sent
                          </Badge>
                        ) : (
                          <Button onClick={() => sendFriendRequest.mutate(profileId!)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Friend
                          </Button>
                        )}
                      </>
                    )}
                    
                    {/* Tip Jar */}
                    {!isOwnProfile && extendedProfile?.tip_jar_enabled && extendedProfile?.paypal_email && (
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`https://paypal.me/${extendedProfile.paypal_email}`, '_blank')}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Tip
                      </Button>
                    )}
                  </div>
                </div>

                {/* Edit Mode Controls */}
                {isOwnProfile && isEditing && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="public-profile"
                          checked={extendedProfile?.is_public || false}
                          onCheckedChange={handleTogglePublic}
                        />
                        <Label htmlFor="public-profile">Public Profile</Label>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Sidebar Embed
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {SIDEBAR_SECTION_TYPES.map(({ type, label, icon: Icon }) => (
                            <DropdownMenuItem key={type} onClick={() => handleAddSection(type)}>
                              <Icon className="h-4 w-4 mr-2" />
                              {label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="py-8">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="about" className="gap-2">
                  <User className="h-4 w-4" />
                  About
                </TabsTrigger>
                <TabsTrigger value="posts" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="media" className="gap-2">
                  <Image className="h-4 w-4" />
                  Media
                </TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about">
                <div className="flex gap-6">
                  {/* Left Column - Bio (fixed max-width like posts) */}
                  <div className="w-full max-w-2xl space-y-6">
                    {extendedProfile && (
                      <BioSection profile={extendedProfile} isEditing={isEditing} />
                    )}
                  </div>

                  {/* Right Column - Embeds & Info (fills remaining space) */}
                  <div className="hidden lg:block flex-1 space-y-6">
                    {/* Sidebar Embed Sections */}
                    {sidebarSections.map(section => renderSection(section, true))}

                    {/* Social Links */}
                    {extendedProfile?.social_links && Object.keys(extendedProfile.social_links).length > 0 && (
                      <Card>
                        <CardContent className="pt-6">
                          <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            Links
                          </h3>
                          <div className="space-y-2">
                            {extendedProfile.website_url && (
                              <a 
                                href={extendedProfile.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <Globe className="h-4 w-4" />
                                Website
                              </a>
                            )}
                            {Object.entries(extendedProfile.social_links as Record<string, string>).map(([platform, url]) => (
                              <a 
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline capitalize"
                              >
                                <Share2 className="h-4 w-4" />
                                {platform}
                              </a>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Member Info */}
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-4">Info</h3>
                        <p className="text-sm text-muted-foreground">
                          Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                        </p>
                        {extendedProfile?.profile_type && (
                          <Badge variant="outline" className="mt-2 capitalize">
                            {extendedProfile.profile_type}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts">
                <div className="flex gap-6">
                  {/* Left Column - Posts (same max-width as About) */}
                  <div className="w-full max-w-2xl space-y-4">
                    {postsLoading ? (
                      <>
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                      </>
                    ) : posts?.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No posts yet</p>
                        </CardContent>
                      </Card>
                    ) : (
                      posts?.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={{
                            ...post,
                            profiles: {
                              full_name: profile.full_name,
                              avatar_url: profile.avatar_url,
                            },
                            user_appreciated: false,
                          }} 
                        />
                      ))
                    )}
                  </div>
                  {/* Right Column - Reserved for future use */}
                  <div className="hidden lg:block flex-1">
                    {/* Future sidebar content */}
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media">
                <div className="space-y-6">
                  {/* Gallery Section */}
                  {sections?.filter(s => s.section_type === 'gallery').map(section => renderSection(section))}
                  
                  {/* YouTube Videos from posts or sections */}
                  {sections?.filter(s => s.section_type === 'youtube').length === 0 && 
                   sections?.filter(s => s.section_type === 'gallery').length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No media yet</p>
                        {isEditing && (
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => handleAddSection('gallery')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Gallery
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Image Cropper Dialog */}
        <ImageCropper
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            URL.revokeObjectURL(cropImageSrc);
            setCropImageSrc('');
          }}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={cropType === 'avatar' ? 1 : 16/5}
          circularCrop={cropType === 'avatar'}
          title={cropType === 'avatar' ? 'Crop Profile Picture' : 'Crop Cover Image'}
        />
      </div>
    </>
  );
}
