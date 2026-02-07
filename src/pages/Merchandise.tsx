import { AppLayout } from '@/components/layout/AppLayout';
import { Store } from 'lucide-react';

export default function Merchandise() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Store className="h-7 w-7 text-secondary" />
          <div>
            <h1 className="text-3xl font-bold">Merchandise Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your merch catalogue, variants, and sales</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
