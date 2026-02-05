import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUserProfile, useUserPosts, useUserStats, useUpdateBio, useUploadAvatar } from '@/hooks/useProfile';
import { useFriendships, useSendFriendRequest } from '@/hooks/useSocial';
import { useCreateConversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
// useR2Upload moved to HeroOverlayControls for cover uploads
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
import { useProfilePages, useEnsureHomePage } from '@/hooks/useProfilePages';
import { useHeroSettings, useUpdateHeroSettings, CoverSettings } from '@/hooks/useHeroSettings';
import { HeroSection } from '@/components/profile/HeroSection';
import { HeroEditor } from '@/components/profile/HeroEditor';
import { HeroOverlayControls } from '@/components/profile/HeroOverlayControls';
import { ProfileNav } from '@/components/profile/ProfileNav';
import { PageManager } from '@/components/profile/PageManager';
// CoverImageUploader removed - cover upload now handled by HeroOverlayControls
import { DevicePreviewToggle, DeviceType, getDeviceMaxWidth } from '@/components/profile/DevicePreviewToggle';
import { SortableSection } from '@/components/profile/SortableSection';
import { getLayoutClass } from '@/components/profile/GridLayout';
import { PremiumGate, usePremiumCheck } from '@/components/profile/PremiumGate';
import { AddSectionModal } from '@/components/profile/AddSectionModal';
import { TextBlock } from '@/components/profile/sections/TextBlock';
import { DonationBlock } from '@/components/profile/sections/DonationBlock';
import { AudioBlock } from '@/components/profile/sections/AudioBlock';
import { ImageBlock } from '@/components/profile/sections/ImageBlock';
import { ButtonBlock } from '@/components/profile/sections/ButtonBlock';
import { DividerBlock } from '@/components/profile/sections/DividerBlock';
import { SpacerBlock } from '@/components/profile/sections/SpacerBlock';
import { HeadingBlock } from '@/components/profile/sections/HeadingBlock';
import { IconBlock } from '@/components/profile/sections/IconBlock';
import { CounterBlock } from '@/components/profile/sections/CounterBlock';
import { ProgressBlock } from '@/components/profile/sections/ProgressBlock';
import { AccordionBlock } from '@/components/profile/sections/AccordionBlock';
import { HtmlBlock } from '@/components/profile/sections/HtmlBlock';
import { AlertBlock } from '@/components/profile/sections/AlertBlock';
import { TabsBlock } from '@/components/profile/sections/TabsBlock';
import { ToggleListBlock } from '@/components/profile/sections/ToggleListBlock';
import { SliderBlock } from '@/components/profile/sections/SliderBlock';
import { TestimonialBlock } from '@/components/profile/sections/TestimonialBlock';
import { CarouselBlock } from '@/components/profile/sections/CarouselBlock';
import { ShortcodeBlock } from '@/components/profile/sections/ShortcodeBlock';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { userId, slug } = useParams<{ userId: string; slug?: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isProfileRoute = location.pathname.startsWith('/@');
  const isProfileManageRoute =
    location.pathname === '/profile' || location.pathname.startsWith('/profile/pages');
  
  const isOwnProfile = !userId || userId === user?.id;
  const isOwnProfileManageRoute = isProfileManageRoute && isOwnProfile;
  const profileId = userId || user?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(profileId);
  const { data: extendedProfile } = useExtendedProfile(profileId);
  const { data: heroSettings } = useHeroSettings(profileId);
  const { data: pages = [] } = useProfilePages(profileId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(profileId!);
  const { data: stats } = useUserStats(profileId!);
  const { data: friendships } = useFriendships();
  // Fetch sections filtered by current page to prevent cross-page leakage
  const currentPageId = useMemo(() => {
    if (!pages.length) return undefined; // Pages not loaded yet
    const slug = location.pathname.match(/\/pages\/([^/]+)/)?.[1];
    const normalizedSlug = (!slug || slug === 'home') ? null : slug;
    if (normalizedSlug) {
      return pages.find(p => p.slug === normalizedSlug)?.id || undefined;
    }
    return pages.find(p => p.is_home)?.id || undefined;
  }, [pages, location.pathname]);
  
  const { data: sections, isLoading: sectionsLoading } = useProfileSections(profileId, currentPageId);
  
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
  const ensureHomePage = useEnsureHomePage();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => (isOwnProfileManageRoute ? 'page' : 'about'));
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>('desktop');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [showStickyDoneButton, setShowStickyDoneButton] = useState(false);
  // cropType removed - only avatar uses cropper now
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  // coverInputRef removed - cover upload now handled by HeroOverlayControls

  // Track scroll position to show/hide sticky Done Editing button
  useEffect(() => {
    if (!isEditing || !isOwnProfile) {
      setShowStickyDoneButton(false);
      return;
    }

    const handleScroll = () => {
      if (!profileCardRef.current) return;
      
      const rect = profileCardRef.current.getBoundingClientRect();
      // Show sticky button when profile card is scrolled out of view
      const isProfileCardOutOfView = rect.bottom < 100;
      setShowStickyDoneButton(isProfileCardOutOfView);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isEditing, isOwnProfile]);

  // Ensure home page exists when entering profile management
  useEffect(() => {
    if (isOwnProfileManageRoute && pages.length === 0) {
      ensureHomePage.mutate();
    }
  }, [isOwnProfileManageRoute, pages.length, ensureHomePage]);

  // Switch to 'page' tab when on profile management route (home or custom pages)
  useEffect(() => {
    if (isOwnProfileManageRoute && activeTab !== 'page') {
      setActiveTab('page');
    }
  }, [isOwnProfileManageRoute]);

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
      fileInputRef.current?.click();
    }
  };

  // handleCoverClick removed - cover upload now handled by HeroOverlayControls

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropperOpen(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    await uploadAvatar.mutateAsync(file);
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

  // Premium check - admins bypass premium restrictions
  const { isPremium: isPremiumTier, canAddMoreSections } = usePremiumCheck(extendedProfile?.profile_tier);
  const isPremium = isPremiumTier || isAdmin;
  
  // Count custom sections (gallery, projects, custom_tabs)
  const customSectionCount = (sections || []).filter(s => 
    ['gallery', 'projects', 'custom_tabs'].includes(s.section_type)
  ).length;

  const handleAddSection = async (sectionType: string, pageId?: string | null) => {
    // Check premium gates - admins bypass
    if (!isAdmin && PREMIUM_SECTION_TYPES.includes(sectionType) && !isPremiumTier) {
      toast.error('Upgrade to Premium to add commerce blocks');
      return;
    }
    
    // Check section limit for custom sections - admins bypass
    if (!isAdmin && ['gallery', 'projects', 'custom_tabs'].includes(sectionType) && !canAddMoreSections(customSectionCount)) {
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
      image_block: 'Image',
      button_block: 'Button',
      divider: 'Divider',
      spacer: 'Spacer',
      heading: 'Heading',
    };
    
    await createSection.mutateAsync({
      section_type: sectionType,
      title: sectionLabels[sectionType] || sectionType,
      page_id: pageId,
    });
    
    // Enable editing mode after adding a section
    setIsEditing(true);
    toast.success('Section added');
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

  // Normalize slug: treat 'home' the same as no slug (show home page)
  const normalizedSlug = (!slug || slug === 'home') ? null : slug;
  
  // Show multi-page features on profile route OR own profile on /profile
  const showMultiPageFeatures = isProfileRoute || isOwnProfile;
  
  // Find the current page based on slug - also check for home page on /profile route
  const currentPage = useMemo(() => {
    // On public profile route or own profile, find the current page
    if (showMultiPageFeatures) {
      if (normalizedSlug) {
        return pages.find(p => p.slug === normalizedSlug) || null;
      }
      // Find home page for /profile or /@username routes without slug
      const homePage = pages.find(p => p.is_home);
      return homePage || null;
    }
    return null;
  }, [showMultiPageFeatures, pages, normalizedSlug]);
  
  // Check if we have an invalid slug (slug provided but page not found)
  const isInvalidSlug = isProfileRoute && normalizedSlug && pages.length > 0 && !currentPage;

  // All sections sorted by order_index
  // Sections are already filtered by page_id at the query level via useProfileSections(profileId, currentPageId)
  const sortedSections = useMemo(() => {
    return [...(sections || [])].sort((a, b) => a.order_index - b.order_index);
  }, [sections]);
  
  const mainSections = sortedSections.filter(s => 
    ['gallery', 'projects', 'custom_tabs', 'social_feed', 'digital_products', 'text_block', 'donation', 'audio_player', 'image_block', 'button_block', 'divider', 'spacer', 'heading', 'icon_block', 'counter', 'progress_bar', 'accordion', 'html_block', 'alert', 'tabs_block', 'toggle_list', 'slider_block', 'testimonial', 'carousel', 'shortcode'].includes(s.section_type)
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
      case 'image_block':
        return <ImageBlock key={section.id} {...props} />;
      case 'button_block':
        return <ButtonBlock key={section.id} {...props} />;
      case 'divider':
        return <DividerBlock key={section.id} {...props} />;
      case 'spacer':
        return <SpacerBlock key={section.id} {...props} />;
      case 'heading':
        return <HeadingBlock key={section.id} {...props} />;
      case 'icon_block':
        return <IconBlock key={section.id} {...props} />;
      case 'counter':
        return <CounterBlock key={section.id} {...props} />;
      case 'progress_bar':
        return <ProgressBlock key={section.id} {...props} />;
      case 'accordion':
        return <AccordionBlock key={section.id} {...props} />;
      case 'html_block':
        return <HtmlBlock key={section.id} {...props} />;
      case 'alert':
        return <AlertBlock key={section.id} {...props} />;
      case 'tabs_block':
        return <TabsBlock key={section.id} {...props} />;
      case 'toggle_list':
        return <ToggleListBlock key={section.id} {...props} />;
      case 'slider_block':
        return <SliderBlock key={section.id} {...props} />;
      case 'testimonial':
        return <TestimonialBlock key={section.id} {...props} />;
      case 'carousel':
        return <CarouselBlock key={section.id} {...props} />;
      case 'shortcode':
        return <ShortcodeBlock key={section.id} {...props} userId={profileId} profileSlug={profileId} />;
      default:
        return null;
    }
  };

  if (profileLoading) {
    return (
      <>
        <SiteHeader nonSticky />
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
        <SiteHeader nonSticky />
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

  // Show 404 for invalid page slug (but not in edit mode - default to home)
  if (isInvalidSlug && !isOwnProfile) {
    return (
      <>
        <SiteHeader nonSticky />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This page doesn't exist on {profile?.full_name || 'this profile'}.
            </p>
            <Button
              onClick={() => navigate(`/@${extendedProfile?.username || userId}`)}
              variant="outline"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Get max-width constraint for device preview
  const deviceMaxWidth = isEditing ? getDeviceMaxWidth(previewDevice) : undefined;

  return (
    <>
      <Helmet>
        <title>
          {showMultiPageFeatures && currentPage
            ? `${profile?.full_name || 'Artist'} – ${currentPage.title}`
            : profile?.full_name || 'Profile'}
        </title>
      </Helmet>
      <SiteHeader nonSticky />
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

        {/* Hero Section - Always use HeroSection for consistent display */}
        <div className="relative">
          <HeroSection 
            heroType={heroSettings?.hero_type || 'standard'} 
            heroConfig={heroSettings?.hero_config || {}}
            coverSettings={heroSettings?.cover_settings}
            fallbackName={profile?.full_name || undefined}
            fallbackCoverImage={extendedProfile?.cover_image_url}
          />
          
          {/* Edit overlay controls for hero - in top right corner */}
          {isEditing && isOwnProfile && (
            <HeroOverlayControls
              heroType={heroSettings?.hero_type || 'standard'}
              heroConfig={heroSettings?.hero_config || {}}
              coverSettings={heroSettings?.cover_settings || { height: 'medium', focalPointX: 50, focalPointY: 50 }}
              coverImageUrl={heroSettings?.hero_config?.backgroundImage || extendedProfile?.cover_image_url}
              onUpdateHero={(type, config) => updateHeroSettings.mutate({ hero_type: type, hero_config: config })}
              onUpdateCoverSettings={(settings) => updateHeroSettings.mutate({ cover_settings: settings })}
              onUpdateCoverImage={async (url) => {
                await updateExtendedProfile.mutateAsync({ cover_image_url: url });
              }}
              onRemoveCover={async () => {
                // Clear the background image from hero config
                await updateHeroSettings.mutateAsync({ 
                  hero_config: { ...heroSettings?.hero_config, backgroundImage: undefined } 
                });
                // Also clear the cover image URL
                await updateExtendedProfile.mutateAsync({ cover_image_url: null });
                toast.success('Cover image removed');
              }}
            />
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* Profile Header Card - overlapping cover */}
          <div className="-mt-16 sm:-mt-20 relative z-10" ref={profileCardRef}>
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
                      onChange={handleFileChange}
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
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setInviteFriendsOpen(true)}
                          aria-label="Invite friends"
                        >
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

                {isOwnProfile && (
                  <Dialog open={inviteFriendsOpen} onOpenChange={setInviteFriendsOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Invite Friends</DialogTitle>
                      </DialogHeader>
                      <ReferralSection />
                    </DialogContent>
                  </Dialog>
                )}

                {/* Edit Mode Controls */}
                {isOwnProfile && isEditing && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex flex-wrap gap-4 items-center">
                      {/* Hero Editor - for quick access */}
                      <HeroEditor
                        heroType={heroSettings?.hero_type || 'standard'}
                        heroConfig={heroSettings?.hero_config || {}}
                        onSave={(type, config) => updateHeroSettings.mutate({ hero_type: type, hero_config: config })}
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
                            <DropdownMenuItem key={type} onClick={() => handleAddSection(type, currentPage?.id)}>
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
                              onClick={() => handleAddSection(type, currentPage?.id)}
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
                    
                    {/* Page Manager - for creating/managing website pages */}
                    <div className="mt-6">
                      <PageManager 
                        userId={profileId!} 
                        onManageSections={(pageId, pageTitle) => {
                          toast.info(`Managing sections for: ${pageTitle}`);
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="py-8">
            {/* Unified Navigation - ProfileNav with built-in About/Posts/Media tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <ProfileNav 
                userId={profileId!} 
                brandColor={heroSettings?.brand_color}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              
              {/* Device Preview Toggle - only in edit mode */}
              {isOwnProfile && isEditing && (
                <DevicePreviewToggle
                  device={previewDevice}
                  onChange={setPreviewDevice}
                />
              )}
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

              {/* About Tab */}
              <TabsContent value="about">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column - Bio (fixed max-width like posts) */}
                  <div className="w-full lg:max-w-2xl space-y-6">
                    {extendedProfile && (
                      <BioSection profile={extendedProfile} isEditing={isEditing} />
                    )}
                    
                    
                    {/* Main Content Sections - 12-column grid for flexible layouts */}
                    {mainSections.length === 0 && showMultiPageFeatures ? (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        <p className="mb-4">This page is empty.</p>
                        {isOwnProfile && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddSectionOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Content
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
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
                                    onDelete={() => handleDeleteSection(section.id)}
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
                      </>
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
                                  onDelete={() => handleDeleteSection(section.id)}
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
                                onDelete={() => handleDeleteSection(section.id)}
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

              {/* Page Tab - for edit mode custom pages */}
              {showMultiPageFeatures && (
                <TabsContent value="page">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Main content sections */}
                    <div className="w-full lg:max-w-2xl space-y-6">
                      {mainSections.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <p className="mb-4">This page is empty.</p>
                          {isOwnProfile && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAddSectionOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Content
                            </Button>
                          )}
                        </div>
                      ) : isEditing && isOwnProfile ? (
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
                                  onDelete={() => handleDeleteSection(section.id)}
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
                      
                      {/* Always show Add Content button after sections */}
                      {isOwnProfile && mainSections.length > 0 && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddSectionOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Content
                          </Button>
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
                                      onDelete={() => handleDeleteSection(section.id)}
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
                      </div>
                    </div>

                    {/* Right Column - Sidebar content */}
                    <div className="hidden lg:block flex-1 space-y-6">
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
                                  onDelete={() => handleDeleteSection(section.id)}
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
                    </div>
                  </div>
                </TabsContent>
              )}
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
          aspectRatio={1}
          circularCrop={true}
          title="Crop Profile Picture"
        />

        {/* Add Section Modal */}
        <AddSectionModal
          open={addSectionOpen}
          onOpenChange={setAddSectionOpen}
          onAddSection={(sectionType) => handleAddSection(sectionType, currentPage?.id)}
          isPremium={isPremium}
        />

        {/* Sticky Done Editing Button - appears when scrolled past profile card */}
        {isOwnProfile && isEditing && showStickyDoneButton && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setIsEditing(false)}
              className="shadow-lg"
              size="lg"
            >
              <Check className="h-4 w-4 mr-2" />
              Done Editing
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
