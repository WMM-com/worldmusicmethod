import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserOrders } from '@/components/account/UserOrders';
import { UserSubscriptions } from '@/components/account/UserSubscriptions';
import { Package, RefreshCw, User } from 'lucide-react';

export default function Account() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-muted-foreground mt-1">{user?.email}</p>
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="mb-6">
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Subscriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <UserOrders />
            </TabsContent>

            <TabsContent value="subscriptions">
              <UserSubscriptions />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
