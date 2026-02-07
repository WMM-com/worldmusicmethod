import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Mail, FileText, FormInput, ShoppingCart, ListIcon, Send, ScrollText } from 'lucide-react';
import { AdminTags } from './email-crm/AdminTags';
import { AdminEmailTemplates } from './email-crm/AdminEmailTemplates';
import { AdminSequences } from './email-crm/AdminSequences';
import { AdminOptinForms } from './email-crm/AdminOptinForms';
import { AdminCartAbandonment } from './email-crm/AdminCartAbandonment';
import { AdminLists } from './email-crm/AdminLists';
import { AdminCampaigns } from './email-crm/AdminCampaigns';
import { AdminEmailLogs } from './email-crm/AdminEmailLogs';

export function AdminEmailCRM() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="campaigns" className="gap-2">
            <Send className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="lists" className="gap-2">
            <ListIcon className="h-4 w-4" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="sequences" className="gap-2">
            <Mail className="h-4 w-4" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FormInput className="h-4 w-4" />
            Opt-in Forms
          </TabsTrigger>
          <TabsTrigger value="cart" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart Abandonment
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <AdminCampaigns />
        </TabsContent>
        <TabsContent value="lists">
          <AdminLists />
        </TabsContent>
        <TabsContent value="tags">
          <AdminTags />
        </TabsContent>
        <TabsContent value="templates">
          <AdminEmailTemplates />
        </TabsContent>
        <TabsContent value="sequences">
          <AdminSequences />
        </TabsContent>
        <TabsContent value="forms">
          <AdminOptinForms />
        </TabsContent>
        <TabsContent value="cart">
          <AdminCartAbandonment />
        </TabsContent>
        <TabsContent value="logs">
          <AdminEmailLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
