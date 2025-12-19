import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useUserProfile, useUserPosts, useUserStats, useUpdateBio, useUploadAvatar } from '@/hooks/useProfile';
import { useFriendships, useSendFriendRequest } from '@/hooks/useSocial';
import { useCreateConversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/social/PostCard';
import { ImageCropper } from '@/components/ui/image-cropper';
import { User, Camera, Edit2, MessageSquare, UserPlus, Check, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwnProfile = !userId || userId === user?.id;
  const profileId = userId || user?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(profileId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(profileId!);
  const { data: stats } = useUserStats(profileId!);
  const { data: friendships } = useFriendships();
  
  const updateBio = useUpdateBio();
  const uploadAvatar = useUploadAvatar();
  const sendFriendRequest = useSendFriendRequest();
  const createConversation = useCreateConversation();

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFriend = friendships?.friends.some(
    f => f.user_id === profileId || f.friend_id === profileId
  );
  const hasPendingRequest = friendships?.pending.some(
    f => f.friend_id === profileId
  );

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a URL for the cropper
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropperOpen(true);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to file
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    await uploadAvatar.mutateAsync(file);
    // Clean up the URL
    URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc('');
  };

  const handleSaveBio = async () => {
    await updateBio.mutateAsync(bio);
    setIsEditingBio(false);
  };

  const handleStartBioEdit = () => {
    setBio(profile?.bio || '');
    setIsEditingBio(true);
  };

  const handleMessage = async () => {
    if (!profileId) return;
    const conversationId = await createConversation.mutateAsync(profileId);
    navigate('/messages', { state: { conversationId } });
  };

  if (profileLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Avatar */}
                <div className="relative">
                  <Avatar
                    className={`h-32 w-32 ${isOwnProfile ? 'cursor-pointer' : ''}`}
                    onClick={handleAvatarClick}
                  >
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl">
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                      onClick={handleAvatarClick}
                    >
                      <Camera className="h-4 w-4" />
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
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold mb-1">
                    {profile.full_name || 'Anonymous'}
                  </h1>
                  {profile.business_name && (
                    <p className="text-muted-foreground mb-2">{profile.business_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4">
                    Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-6 justify-center sm:justify-start mb-4">
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

                  {/* Actions */}
                  {!isOwnProfile && (
                    <div className="flex gap-2 justify-center sm:justify-start">
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
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">About</h3>
                  {isOwnProfile && !isEditingBio && (
                    <Button variant="ghost" size="sm" onClick={handleStartBioEdit}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingBio ? (
                  <div className="space-y-2">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveBio} disabled={updateBio.isPending}>
                        Save
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditingBio(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {profile.bio || (isOwnProfile ? 'Add a bio to tell others about yourself.' : 'No bio yet.')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <h2 className="text-xl font-bold mb-4">Public Posts</h2>
          <div className="space-y-4">
            {postsLoading ? (
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : posts?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No public posts yet</p>
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
        </div>
      </div>
    </>
  );
}
