import { AppLayout } from '@/components/layout/AppLayout';
import { Store } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchOverviewTab } from '@/components/merchandise/MerchOverviewTab';
import { MerchProductsTab } from '@/components/merchandise/MerchProductsTab';
import { MerchGigsTab } from '@/components/merchandise/MerchGigsTab';

export default function Merchandise() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Store className="h-7 w-7 text-secondary" />
          <div>
            <h1 className="text-3xl font-bold">Merchandise</h1>
            <p className="text-muted-foreground mt-1">Manage products, track gig sales, and view revenue</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="gigs">Gigs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <MerchOverviewTab />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <MerchProductsTab />
          </TabsContent>

          <TabsContent value="gigs" className="mt-6">
            <MerchGigsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
