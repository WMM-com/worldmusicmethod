import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Music } from 'lucide-react';
import { TechSpecsTab } from '@/components/documents/TechSpecsTab';

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'documents');

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === 'documents' || tabFromUrl === 'techspecs')) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {activeTab === 'techspecs' ? 'Tech Specs' : 'Documents'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'techspecs' 
              ? 'Create visual stage plots to share with venues and sound engineers'
              : 'Manage and share your professional documents'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="documents" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="techspecs" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Music className="h-4 w-4 mr-2" />
              Tech Specs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Documents Coming Soon</h3>
              <p className="text-sm">Store contracts, rider documents, and more.</p>
            </div>
          </TabsContent>

          <TabsContent value="techspecs">
            <TechSpecsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
