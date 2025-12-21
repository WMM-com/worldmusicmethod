import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

interface EmailTag {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function AdminTags() {
  const [tags, setTags] = useState<EmailTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<EmailTag | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    const { data, error } = await supabase
      .from('email_tags')
      .select('id, name, description, created_at')
      .order('name');
    
    if (error) {
      toast.error('Failed to load tags');
    } else {
      setTags((data || []) as EmailTag[]);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('Tag name is required');
      return;
    }

    if (editingTag) {
      const { error } = await supabase
        .from('email_tags')
        .update({ name: formData.name.trim(), description: formData.description.trim() || null })
        .eq('id', editingTag.id);

      if (error) {
        toast.error('Failed to update tag');
      } else {
        toast.success('Tag updated');
        fetchTags();
      }
    } else {
      const { error } = await supabase
        .from('email_tags')
        .insert({ name: formData.name.trim(), description: formData.description.trim() || null });

      if (error) {
        toast.error('Failed to create tag');
      } else {
        toast.success('Tag created');
        fetchTags();
      }
    }

    setDialogOpen(false);
    setEditingTag(null);
    setFormData({ name: '', description: '' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag?')) return;
    const { error } = await supabase.from('email_tags').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete tag');
    } else {
      toast.success('Tag deleted');
      fetchTags();
    }
  }

  function openEdit(tag: EmailTag) {
    setEditingTag(tag);
    setFormData({ name: tag.name, description: tag.description || '' });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingTag(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Email Tags
            </CardTitle>
            <CardDescription>
              Create tags to segment and organize your contacts
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
                <DialogDescription>
                  Tags help you organize contacts and trigger automations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Purchased Course A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What this tag represents..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingTag ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : tags.length === 0 ? (
          <p className="text-muted-foreground">No tags created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <Badge variant="secondary">{tag.name}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tag.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tag.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tag.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
