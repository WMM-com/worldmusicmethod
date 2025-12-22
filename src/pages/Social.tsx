import { useEffect } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CreatePost } from '@/components/social/CreatePost';
import { PostCard } from '@/components/social/PostCard';
import { FriendsList } from '@/components/social/FriendsList';
import { GroupsList } from '@/components/groups/GroupsList';
import { MembersList } from '@/components/community/MembersList';
import { PendingInvitesBanner } from '@/components/groups/PendingInvitesBanner';
import { useFeed } from '@/hooks/useSocial';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Newspaper, UsersRound, UserSearch, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function Social() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: posts, isLoading } = useFeed();
  
  const activeTab = searchParams.get('tab') || 'feed';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const postId = searchParams.get('postId');
  const openComments = searchParams.get('openComments') === 'true';

  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'feed') return;
    if (!postId) return;
    if (isLoading) return;

    // Defer to ensure the DOM has rendered the post cards.
    const t = window.setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    return () => window.clearTimeout(t);
  }, [user, activeTab, postId, isLoading, posts]);

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
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Community</h1>
                  <p className="text-muted-foreground">Connect with fellow musicians</p>
                </div>
              </div>
              {!user && (
                <Button asChild>
                  <Link to="/auth">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in to participate
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <UserSearch className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                Groups
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="feed">
              {!user ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Sign in to view the feed</h3>
                    <p className="text-muted-foreground mb-4">
                      Join the community to see posts from friends and share your own.
                    </p>
                    <Button asChild>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Feed */}
                  <div className="lg:col-span-2 space-y-4">
                    <CreatePost />
                    
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
                            Be the first to share something, or add friends to see their posts.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      posts?.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          defaultShowComments={post.id === postId && openComments}
                        />
                      ))
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    <FriendsList />
                  </div>
                </div>
              )}
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
