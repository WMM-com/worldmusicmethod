import { SiteHeader } from '@/components/layout/SiteHeader';
import { CreatePost } from '@/components/social/CreatePost';
import { PostCard } from '@/components/social/PostCard';
import { FriendsList } from '@/components/social/FriendsList';
import { useFeed } from '@/hooks/useSocial';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Social() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: posts, isLoading } = useFeed();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Community</h1>
                <p className="text-muted-foreground">Connect with fellow musicians</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
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
                posts?.map((post) => <PostCard key={post.id} post={post} />)
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <FriendsList />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
