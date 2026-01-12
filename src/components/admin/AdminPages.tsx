import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Page {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  meta_title: string | null;
  meta_description: string | null;
  redirect_url: string | null;
  redirect_code: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

type PageFormData = Omit<Page, 'id' | 'created_at' | 'updated_at'>;

const defaultFormData: PageFormData = {
  title: '',
  slug: '',
  page_type: 'static',
  meta_title: null,
  meta_description: null,
  redirect_url: null,
  redirect_code: 301,
  is_published: true,
};

export function AdminPages() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState<PageFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch pages
  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('title');
      if (error) throw error;
      return data as Page[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PageFormData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('pages')
          .update({
            title: data.title,
            slug: data.slug,
            page_type: data.page_type,
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            redirect_url: data.redirect_url,
            redirect_code: data.redirect_code,
            is_published: data.is_published,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pages')
          .insert({
            title: data.title,
            slug: data.slug,
            page_type: data.page_type,
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            redirect_url: data.redirect_url,
            redirect_code: data.redirect_code,
            is_published: data.is_published,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success(editingPage ? 'Page updated' : 'Page created');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('Page deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = (page?: Page) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        title: page.title,
        slug: page.slug,
        page_type: page.page_type,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        redirect_url: page.redirect_url,
        redirect_code: page.redirect_code,
        is_published: page.is_published,
      });
    } else {
      setEditingPage(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPage(null);
    setFormData(defaultFormData);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.slug.trim()) {
      toast.error('Title and slug are required');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingPage?.id,
    });
  };

  const filteredPages = pages?.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPageTypeBadge = (type: string) => {
    switch (type) {
      case 'redirect':
        return <Badge variant="secondary"><ArrowRightLeft className="h-3 w-3 mr-1" />Redirect</Badge>;
      case 'course':
        return <Badge variant="default">Course</Badge>;
      default:
        return <Badge variant="outline">Static</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pages & Redirects</CardTitle>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages?.map((page) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">/{page.slug}</code>
                </TableCell>
                <TableCell>{getPageTypeBadge(page.page_type)}</TableCell>
                <TableCell>
                  {page.is_published ? (
                    <Badge variant="default" className="bg-green-500">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {page.page_type !== 'redirect' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(page)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this page?')) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPages?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No pages found. Create your first page to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPage ? 'Edit Page' : 'Create Page'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Page title"
                />
              </div>

              <div>
                <Label>Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
                    })}
                    placeholder="page-slug"
                  />
                </div>
              </div>

              <div>
                <Label>Page Type</Label>
                <Select
                  value={formData.page_type}
                  onValueChange={(value) => setFormData({ ...formData, page_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Static Page</SelectItem>
                    <SelectItem value="course">Course Page</SelectItem>
                    <SelectItem value="redirect">Redirect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.page_type === 'redirect' && (
                <>
                  <div>
                    <Label>Redirect URL</Label>
                    <Input
                      value={formData.redirect_url || ''}
                      onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                      placeholder="/new-page or https://example.com"
                    />
                  </div>
                  <div>
                    <Label>Redirect Type</Label>
                    <Select
                      value={String(formData.redirect_code || 301)}
                      onValueChange={(value) => setFormData({ ...formData, redirect_code: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="301">301 (Permanent)</SelectItem>
                        <SelectItem value="302">302 (Temporary)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label>Meta Title (SEO)</Label>
                <Input
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="Page title for search engines"
                />
              </div>

              <div>
                <Label>Meta Description (SEO)</Label>
                <Textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="Brief description for search engines"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label>Published</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}