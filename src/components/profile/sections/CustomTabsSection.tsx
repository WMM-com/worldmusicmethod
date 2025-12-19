import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  useProfileTabs, 
  useCreateTab, 
  useUpdateTab,
  useDeleteTab,
  ProfileTab 
} from '@/hooks/useProfilePortfolio';
import { FileText, Plus, Edit2, Trash2 } from 'lucide-react';

interface CustomTabsSectionProps {
  userId: string;
  isEditing: boolean;
}

export function CustomTabsSection({ userId, isEditing }: CustomTabsSectionProps) {
  const { data: tabs = [] } = useProfileTabs(userId);
  const createTab = useCreateTab();
  const updateTab = useUpdateTab();
  const deleteTab = useDeleteTab();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<ProfileTab | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState<string | undefined>();

  const visibleTabs = tabs.filter(t => t.is_visible);

  const handleOpenDialog = (tab?: ProfileTab) => {
    if (tab) {
      setEditingTab(tab);
      setForm({ title: tab.title, content: tab.content || '' });
    } else {
      setEditingTab(null);
      setForm({ title: '', content: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title) return;

    if (editingTab) {
      await updateTab.mutateAsync({ id: editingTab.id, ...form });
    } else {
      await createTab.mutateAsync(form);
    }
    setDialogOpen(false);
    setForm({ title: '', content: '' });
    setEditingTab(null);
  };

  if (!visibleTabs.length && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Info
        </CardTitle>
        {isEditing && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTab ? 'Edit Page' : 'Add Page'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Page Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Press, History, Contact"
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Page content..."
                    className="min-h-[200px]"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingTab ? 'Update' : 'Create'} Page
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {visibleTabs.length > 0 ? (
          <Tabs value={activeTab || visibleTabs[0]?.id} onValueChange={setActiveTab}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0">
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {visibleTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 whitespace-pre-wrap">
                    {tab.content || 'No content yet'}
                  </div>
                  {isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(tab)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => deleteTab.mutate(tab.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No pages created yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
