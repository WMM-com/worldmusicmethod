import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Music } from 'lucide-react';
import { TechSpecsTab } from '@/components/documents/TechSpecsTab';

export default function Documents() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage and share your professional documents
          </p>
        </div>

        <Tabs defaultValue="techspecs" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="techspecs" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Music className="h-4 w-4 mr-2" />
              Tech Specs
            </TabsTrigger>
            <TabsTrigger value="identity" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground" disabled>
              <FileText className="h-4 w-4 mr-2" />
              ID Documents
              <span className="ml-2 text-xs text-muted-foreground">(Coming Soon)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="techspecs">
            <TechSpecsTab />
          </TabsContent>

          <TabsContent value="identity">
            <div className="text-center py-12 text-muted-foreground">
              ID Documents feature coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
