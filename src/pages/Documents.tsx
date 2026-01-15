import { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentsTab } from '@/components/documents/DocumentsTab';

export default function Documents() {
  const location = useLocation();
  
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage and share your professional documents
          </p>
        </div>

        <DocumentsTab />
      </div>
    </AppLayout>
  );
}
