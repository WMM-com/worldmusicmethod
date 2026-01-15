import { AppLayout } from '@/components/layout/AppLayout';
import { TechSpecsTab } from '@/components/documents/TechSpecsTab';

export default function TechSpecs() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tech Specs</h1>
          <p className="text-muted-foreground mt-1">
            Create visual stage plots to share with venues and sound engineers
          </p>
        </div>

        <TechSpecsTab />
      </div>
    </AppLayout>
  );
}
