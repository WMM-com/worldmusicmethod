import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  useProfileGallery,
  ProfileSection
} from '@/hooks/useProfilePortfolio';
import { useHeroSettings, useUpdateHeroSettings } from '@/hooks/useHeroSettings';
import { HeroSection } from '@/components/profile/HeroSection';
import { HeroEditor } from '@/components/profile/HeroEditor';
import { CoverImageUploader } from '@/components/profile/CoverImageUploader';
import { CoverImageSettings, CoverSettings, getCoverHeightClass, getCoverFocalPoint } from '@/components/profile/CoverImageSettings';
import { DevicePreviewToggle, DeviceType, getDeviceMaxWidth } from '@/components/profile/DevicePreviewToggle';
import { SortableSection } from '@/components/profile/SortableSection';
import { getLayoutClass } from '@/components/profile/GridLayout';
import { PremiumGate, usePremiumCheck } from '@/components/profile/PremiumGate';
import { TextBlock } from '@/components/profile/sections/TextBlock';
import { DonationBlock } from '@/components/profile/sections/DonationBlock';
import { AudioBlock } from '@/components/profile/sections/AudioBlock';
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
import { ReferralSection } from '@/components/profile/ReferralSection';
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
import { DigitalProductsSection } from '@/components/profile/sections/DigitalProductsSection';
import { 
  User, Camera, Edit2, MessageSquare, UserPlus, Check, Users, FileText, 
  Settings, Eye, EyeOff, Plus, GripVertical, Music, Video, Image, 
  Calendar, Share2, Layout, DollarSign, Globe, Lock, Headphones, Code,
  Newspaper, UsersRound, UserSearch, ShoppingBag, Crown, Palette, CreditCard
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Premium-only section types (commerce features)
const PREMIUM_SECTION_TYPES = ['digital_products', 'donation'];

// Sidebar embed sections (right side)
const SIDEBAR_SECTION_TYPES = [
  { type: 'youtube', label: 'YouTube', icon: Video },
  { type: 'spotify', label: 'Spotify', icon: Music },
  { type: 'soundcloud', label: 'SoundCloud', icon: Headphones },
  { type: 'generic', label: 'Other Embed', icon: Code },
];

// Main content sections
const MAIN_SECTION_TYPES = [
  { type: 'text_block', label: 'Text Block', icon: FileText },
  { type: 'gallery', label: 'Gallery', icon: Image },
  { type: 'projects', label: 'Projects', icon: Layout },
  { type: 'custom_tabs', label: 'Info Tabs', icon: FileText },
  { type: 'audio_player', label: 'Audio Player', icon: Headphones },
  { type: 'social_feed', label: 'Social Feed', icon: Share2 },
  { type: 'donation', label: 'Tip Jar', icon: DollarSign },
  { type: 'digital_products', label: 'Digital Products', icon: ShoppingBag },
];

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwnProfile = !userId || userId === user?.id;
  const profileId = userId || user?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(profileId);
  const { data: extendedProfile } = useExtendedProfile(profileId);
  const { data: heroSettings } = useHeroSettings(profileId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(profileId!);
  const { data: stats } = useUserStats(profileId!);
  const { data: friendships } = useFriendships();
  const { data: sections, isLoading: sectionsLoading } = useProfileSections(profileId);
  
  const updateBio = useUpdateBio();
  const uploadAvatar = useUploadAvatar();
  const sendFriendRequest = useSendFriendRequest();
  const createConversation = useCreateConversation();
  const updateExtendedProfile = useUpdateExtendedProfile();
  const updateHeroSettings = useUpdateHeroSettings();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const [isEditing, setIsEditing] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>('desktop');
  const [coverSettings, setCoverSettings] = useState<CoverSettings>({
    height: 'medium',
    focalPointX: 50,
    focalPointY: 50,
  });
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleVisibilityChange = async (newVisibility: 'public' | 'members' | 'private') => {
    await updateExtendedProfile.mutateAsync({ 
      visibility: newVisibility,
      is_public: newVisibility === 'public',
    });
    const labels = { public: 'Public', members: 'Members Only', private: 'Private' };
    toast.success(`Profile visibility: ${labels[newVisibility]}`);
  };

  // Premium check
  const { isPremium, canAddMoreSections } = usePremiumCheck(extendedProfile?.profile_tier);
  
  // Count custom sections (gallery, projects, custom_tabs)
  const customSectionCount = (sections || []).filter(s => 
    ['gallery', 'projects', 'custom_tabs'].includes(s.section_type)
  ).length;

  const handleAddSection = async (sectionType: string) => {
    // Check premium gates
    if (PREMIUM_SECTION_TYPES.includes(sectionType) && !isPremium) {
      toast.error('Upgrade to Premium to add commerce blocks');
      return;
    }
    
    // Check section limit for custom sections
    if (['gallery', 'projects', 'custom_tabs'].includes(sectionType) && !canAddMoreSections(customSectionCount)) {
      toast.error('Upgrade to Premium to add more than 3 custom sections');
      return;
    }
    
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
      digital_products: 'Digital Products',
      text_block: 'Text Block',
      donation: 'Tip Jar',
      audio_player: 'Audio',
    };
    
    await createSection.mutateAsync({
      section_type: sectionType,
      title: sectionLabels[sectionType] || sectionType,
    });
  };

  const handleUpdateSectionLayout = async (sectionId: string, layout: string) => {
    await updateSection.mutateAsync({ id: sectionId, layout });
  };

  const handleUpdateSection = async (sectionId: string, content: Record<string, any>) => {
    await updateSection.mutateAsync({ id: sectionId, content });
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection.mutateAsync(sectionId);
    toast.success('Section removed');
  };

  // Handle drag end for reordering sections
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !sections) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      const newOrderArray = reorderedSections.map(s => s.id);
      reorderSections.mutate(newOrderArray);
    }
  }, [sections, reorderSections]);

  // Move section up/down handler
  const handleMoveSection = useCallback((sectionId: string, direction: 'up' | 'down', sectionList: typeof sections) => {
    if (!sectionList) return;
    
    const currentIndex = sectionList.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sectionList.length) return;
    
    const reorderedSections = arrayMove(sectionList, currentIndex, newIndex);
    const newOrderArray = reorderedSections.map(s => s.id);
    reorderSections.mutate(newOrderArray);
  }, [reorderSections]);

  // All sections sorted by order_index
  const sortedSections = [...(sections || [])].sort((a, b) => a.order_index - b.order_index);
  
  // Categorize sections for layout
  const mainSections = sortedSections.filter(s => 
    ['gallery', 'projects', 'custom_tabs', 'social_feed', 'digital_products', 'text_block', 'donation', 'audio_player'].includes(s.section_type)
  );
  
  const sidebarSections = sortedSections.filter(s => 
    ['youtube', 'spotify', 'soundcloud', 'events', 'generic'].includes(s.section_type)
  );

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
      case 'digital_products':
        return <DigitalProductsSection key={section.id} {...props} userId={profileId!} />;
      case 'text_block':
        return <TextBlock key={section.id} {...props} />;
      case 'donation':
        return <DonationBlock key={section.id} {...props} userId={profileId!} />;
      case 'audio_player':
        return <AudioBlock key={section.id} {...props} userId={profileId!} />;
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

  // Get max-width constraint for device preview
  const deviceMaxWidth = isEditing ? getDeviceMaxWidth(previewDevice) : undefined;

  return (
    <>
      <SiteHeader />
      <div 
        className="min-h-screen bg-background overflow-x-hidden transition-all duration-300"
        style={{
          ...(heroSettings?.brand_color ? { '--brand-color': heroSettings.brand_color } : {}),
          ...(deviceMaxWidth ? { maxWidth: deviceMaxWidth, margin: '0 auto', boxShadow: '0 0 0 1px hsl(var(--border))' } : {}),
        } as React.CSSProperties}
      >
        {/* Community Navigation */}
        <div className="border-b border-border bg-card overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 py-4 overflow-x-auto">
            <div className="flex justify-center min-w-min">
              <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
                <Link 
                  to="/community?tab=feed" 
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors whitespace-nowrap"
                >
                  <Newspaper className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Feed</span>
                </Link>
                <Link 
                  to="/community?tab=friends" 
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors whitespace-nowrap"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Friends</span>
                </Link>
                <Link 
                  to="/community?tab=members" 
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors whitespace-nowrap"
                >
                  <UserSearch className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Members</span>
                </Link>
                <Link 
                  to="/community?tab=groups" 
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors whitespace-nowrap"
                >
                  <UsersRound className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Groups</span>
                </Link>
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-background text-foreground whitespace-nowrap">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">My Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - shows custom hero OR default cover image */}
        {heroSettings?.hero_type && heroSettings.hero_config && (
          heroSettings.hero_config.title || 
          heroSettings.hero_config.backgroundImage || 
          heroSettings.hero_config.cutoutImage
        ) ? (
          <div className="relative">
            <HeroSection 
              heroType={heroSettings.hero_type} 
              heroConfig={heroSettings.hero_config}
              fallbackName={profile?.full_name || undefined}
            />
            {/* Edit overlay for hero */}
            {isEditing && (
              <div className="absolute top-4 right-4 z-20">
                <HeroEditor
                  heroType={heroSettings.hero_type}
                  heroConfig={heroSettings.hero_config}
                  onSave={(type, config) => updateHeroSettings.mutate({ hero_type: type, hero_config: config })}
                  trigger={
                    <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
                      <Edit2 className="h-4 w-4" />
                      Edit Hero
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        ) : (
          /* Default Cover Image (when no hero configured) */
          <div 
            className={`relative ${getCoverHeightClass(coverSettings.height)} bg-gradient-to-r from-primary/20 to-primary/5 ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={handleCoverClick}
            style={extendedProfile?.cover_image_url ? {
              backgroundImage: `url(${extendedProfile.cover_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: getCoverFocalPoint(coverSettings),
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
        )}

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
                      {extendedProfile?.visibility === 'public' ? (
                        <Badge variant="secondary" className="w-fit mx-auto sm:mx-0 bg-primary/20 text-primary">
                          <Globe className="h-3 w-3 mr-1" /> Public
                        </Badge>
                      ) : extendedProfile?.visibility === 'members' ? (
                        <Badge variant="secondary" className="w-fit mx-auto sm:mx-0 bg-secondary text-secondary-foreground">
                          <Users className="h-3 w-3 mr-1" /> Members Only
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
                        {user ? (
                          <Button onClick={handleMessage} variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        ) : (
                          <Button onClick={() => navigate('/auth')} variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        )}
                        {isFriend ? (
                          <Badge variant="secondary" className="h-9 px-3 flex items-center">
                            <Check className="h-4 w-4 mr-1" />
                            Friends
                          </Badge>
                        ) : hasPendingRequest ? (
                          <Badge variant="outline" className="h-9 px-3 flex items-center">
                            Request Sent
                          </Badge>
                        ) : user ? (
                          <Button onClick={() => sendFriendRequest.mutate(profileId!)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Friend
                          </Button>
                        ) : (
                          <Button onClick={() => navigate('/auth')}>
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
                      {/* Cover Image Uploader - separate from Hero */}
                      <CoverImageUploader
                        currentCoverUrl={extendedProfile?.cover_image_url}
                        hasHeroConfigured={!!(
                          heroSettings?.hero_config?.title || 
                          heroSettings?.hero_config?.backgroundImage || 
                          heroSettings?.hero_config?.cutoutImage
                        )}
                        onUpload={async (url) => {
                          await updateExtendedProfile.mutateAsync({ cover_image_url: url });
                        }}
                        onReplaceHero={async () => {
                          // Clear hero settings when replacing with cover image
                          await updateHeroSettings.mutateAsync({ 
                            hero_type: 'standard', 
                            hero_config: {} 
                          });
                        }}
                      />
                      
                      {/* Cover Image Settings */}
                      {extendedProfile?.cover_image_url && !heroSettings?.hero_config?.backgroundImage && (
                        <CoverImageSettings
                          settings={coverSettings}
                          coverImageUrl={extendedProfile.cover_image_url}
                          onUpdate={setCoverSettings}
                        />
                      )}
                      
                      {/* Hero Editor */}
                      <HeroEditor
                        heroType={heroSettings?.hero_type || 'standard'}
                        heroConfig={heroSettings?.hero_config || {}}
                        onSave={(type, config) => updateHeroSettings.mutate({ hero_type: type, hero_config: config })}
                      />
                      
                      {/* Device Preview Toggle */}
                      <DevicePreviewToggle
                        device={previewDevice}
                        onChange={setPreviewDevice}
                      />
                      
                      {/* Visibility Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            {extendedProfile?.visibility === 'public' ? (
                              <><Globe className="h-4 w-4 text-primary" /> Public</>
                            ) : extendedProfile?.visibility === 'members' ? (
                              <><Users className="h-4 w-4 text-primary" /> Members Only</>
                            ) : (
                              <><Lock className="h-4 w-4" /> Private</>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => handleVisibilityChange('public')}
                            className={extendedProfile?.visibility === 'public' ? 'bg-accent' : ''}
                          >
                            <Globe className="h-4 w-4 mr-2 text-primary" />
                            <div>
                              <div className="font-medium">Public</div>
                              <div className="text-xs text-muted-foreground">Anyone can view your profile</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleVisibilityChange('members')}
                            className={extendedProfile?.visibility === 'members' ? 'bg-accent' : ''}
                          >
                            <Users className="h-4 w-4 mr-2 text-primary" />
                            <div>
                              <div className="font-medium">Members Only</div>
                              <div className="text-xs text-muted-foreground">Only logged-in members can view</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleVisibilityChange('private')}
                            className={extendedProfile?.visibility === 'private' ? 'bg-accent' : ''}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">Private</div>
                              <div className="text-xs text-muted-foreground">Hidden from everyone (can't post or comment)</div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
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
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Section
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {MAIN_SECTION_TYPES.map(({ type, label, icon: Icon }) => {
                            const isPremiumOnly = PREMIUM_SECTION_TYPES.includes(type);
                            const isLimited = ['gallery', 'projects', 'custom_tabs'].includes(type) && !canAddMoreSections(customSectionCount);
                            return (
                            <DropdownMenuItem 
                              key={type} 
                              onClick={() => handleAddSection(type)}
                              className={isPremiumOnly && !isPremium ? 'text-muted-foreground' : ''}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {label}
                              {(isPremiumOnly && !isPremium) && <Crown className="h-3 w-3 ml-auto text-primary" />}
                              {isLimited && <Crown className="h-3 w-3 ml-auto text-primary" />}
                            </DropdownMenuItem>
                          )})}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Brand Color Picker - Premium Only */}
                      <PremiumGate
                        profileTier={extendedProfile?.profile_tier}
                        featureName="Brand Colors"
                        mode="inline"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Palette className="h-4 w-4" />
                              <span 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: heroSettings?.brand_color || 'transparent' }}
                              />
                              Brand Color
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-3">
                              <Label>Brand Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={heroSettings?.brand_color || '#6366f1'}
                                  onChange={(e) => updateHeroSettings.mutate({ brand_color: e.target.value })}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={heroSettings?.brand_color || ''}
                                  onChange={(e) => updateHeroSettings.mutate({ brand_color: e.target.value })}
                                  placeholder="#6366f1"
                                  className="flex-1"
                                />
                              </div>
                              {heroSettings?.brand_color && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => updateHeroSettings.mutate({ brand_color: null })}
                                  className="w-full"
                                >
                                  Reset to default
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </PremiumGate>
                      
                      {/* Payment Accounts - Premium Only */}
                      <PremiumGate
                        profileTier={extendedProfile?.profile_tier}
                        featureName="Payment Accounts"
                        mode="inline"
                      >
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => navigate('/settings?section=payments')}
                        >
                          <CreditCard className="h-4 w-4" />
                          Connect Payments
                        </Button>
                      </PremiumGate>
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
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column - Bio (fixed max-width like posts) */}
                  <div className="w-full lg:max-w-2xl space-y-6">
                    {extendedProfile && (
                      <BioSection profile={extendedProfile} isEditing={isEditing} />
                    )}
                    
                    {/* Referral Section - only show on own profile */}
                    {isOwnProfile && <ReferralSection />}
                    
                    {/* Main Content Sections - 12-column grid for flexible layouts */}
                    {isEditing && isOwnProfile ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={mainSections.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid grid-cols-12 gap-4">
                            {mainSections.map((section, index) => (
                              <SortableSection
                                key={section.id}
                                id={section.id}
                                layout={section.layout}
                                isEditing={isEditing}
                                onLayoutChange={(layout) => handleUpdateSectionLayout(section.id, layout)}
                                onMoveUp={() => handleMoveSection(section.id, 'up', mainSections)}
                                onMoveDown={() => handleMoveSection(section.id, 'down', mainSections)}
                                isFirst={index === 0}
                                isLast={index === mainSections.length - 1}
                              >
                                {renderSection(section, false)}
                              </SortableSection>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="grid grid-cols-12 gap-4">
                        {mainSections.map(section => (
                          <div key={section.id} className={getLayoutClass(section.layout)}>
                            {renderSection(section, false)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Mobile: Show sidebar sections here */}
                    <div className="lg:hidden space-y-6">
                      {isEditing && isOwnProfile ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={sidebarSections.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-6">
                              {sidebarSections.map((section, index) => (
                                <SortableSection
                                  key={section.id}
                                  id={section.id}
                                  layout={section.layout}
                                  isEditing={isEditing}
                                  onLayoutChange={(layout) => handleUpdateSectionLayout(section.id, layout)}
                                  onMoveUp={() => handleMoveSection(section.id, 'up', sidebarSections)}
                                  onMoveDown={() => handleMoveSection(section.id, 'down', sidebarSections)}
                                  isFirst={index === 0}
                                  isLast={index === sidebarSections.length - 1}
                                >
                                  {renderSection(section, true)}
                                </SortableSection>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        sidebarSections.map(section => renderSection(section, true))
                      )}
                      
                      {/* Social Links - mobile */}
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
                      
                      {/* Member Info - mobile */}
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

                  {/* Right Column - Embeds & Info (desktop only) */}
                  <div className="hidden lg:block flex-1 space-y-6">
                    {/* Sidebar Embed Sections */}
                    {isEditing && isOwnProfile ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={sidebarSections.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-6">
                            {sidebarSections.map((section, index) => (
                              <SortableSection
                                key={section.id}
                                id={section.id}
                                layout={section.layout}
                                isEditing={isEditing}
                                onLayoutChange={(layout) => handleUpdateSectionLayout(section.id, layout)}
                                onMoveUp={() => handleMoveSection(section.id, 'up', sidebarSections)}
                                onMoveDown={() => handleMoveSection(section.id, 'down', sidebarSections)}
                                isFirst={index === 0}
                                isLast={index === sidebarSections.length - 1}
                              >
                                {renderSection(section, true)}
                              </SortableSection>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      sidebarSections.map(section => renderSection(section, true))
                    )}

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
