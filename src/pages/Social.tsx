import { useEffect } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CreatePost } from '@/components/social/CreatePost';
import { PostCard } from '@/components/social/PostCard';
import { GroupsList } from '@/components/groups/GroupsList';
import { MembersList } from '@/components/community/MembersList';
import { FriendsTab } from '@/components/community/FriendsTab';
import { PendingInvitesBanner } from '@/components/groups/PendingInvitesBanner';
import { CommunitySidebar } from '@/components/community/CommunitySidebar';
import { CommunityPlaylistPlayer } from '@/components/community/CommunityPlaylistPlayer';
import { useFeed } from '@/hooks/useSocial';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Newspaper, UsersRound, UserSearch, LogIn, UserPlus, User } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';

export default function Social() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: posts, isLoading } = useFeed();
  
  const activeTab = searchParams.get('tab') || 'feed';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const postId = searchParams.get('postId');
  const openComments = searchParams.get('openComments') === 'true';
  // Add timestamp to force re-trigger when clicking same post notification multiple times
  const scrollKey = searchParams.get('t');

  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'feed') return;
    if (!postId) return;
    if (isLoading) return;

    // Defer to ensure the DOM has rendered the post cards.
    const t = window.setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        // Scroll with offset for header (approximately 100px for header + some padding)
        const headerOffset = 100;
        const elementPosition = el.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        
        // Briefly highlight the post
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }, 100);

    return () => window.clearTimeout(t);
  }, [user, activeTab, postId, isLoading, scrollKey]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Community</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">Connect with fellow musicians</p>
                </div>
              </div>
              {!user && (
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/auth">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Centered Tabs - aligned with feed content */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6">
              <div className="hidden lg:block" /> {/* Spacer for left sidebar */}
              <div className="max-w-2xl mx-auto w-full">
                <TabsList className={`grid w-full ${user ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="feed" className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    Feed
                  </TabsTrigger>
                  <TabsTrigger value="friends" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Friends
                  </TabsTrigger>
                  <TabsTrigger value="members" className="flex items-center gap-2">
                    <UserSearch className="h-4 w-4" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4" />
                    Groups
                  </TabsTrigger>
                  {user && (
                    <TabsTrigger value="profile" className="flex items-center gap-2" asChild>
                      <Link to="/profile">
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <div className="hidden lg:block" /> {/* Spacer for right sidebar */}
            </div>
            
            <TabsContent value="feed">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6">
                {/* Left Sidebar - Posting Options */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <CommunitySidebar />
                  </div>
                </div>

                {/* Center Feed */}
                <div className="max-w-2xl mx-auto w-full space-y-4">
                  {user ? <CreatePost /> : null}

                  {!user && (
                    <Card>
                      <CardContent className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          You’re viewing the public community feed. Sign in to post, appreciate, and comment.
                        </p>
                        <div className="mt-4">
                          <Button asChild>
                            <Link to="/auth">Sign In</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {isLoading ? (
                    <>
                      <Skeleton className="h-48" />
                      <Skeleton className="h-48" />
                    </>
                  ) : posts?.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No posts yet</h3>
                        <p className="text-muted-foreground">
                          Be the first to share something.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    posts?.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        defaultShowComments={user && post.id === postId && openComments}
                      />
                    ))
                  )}
                </div>

                {/* Right Sidebar - Playlist Player */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <CommunityPlaylistPlayer playlistName="Artists I played with in 2025" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="friends">
              <FriendsTab />
            </TabsContent>
            
            <TabsContent value="groups">
              {user && <PendingInvitesBanner />}
              <GroupsList />
            </TabsContent>
            
            <TabsContent value="members">
              <MembersList />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
