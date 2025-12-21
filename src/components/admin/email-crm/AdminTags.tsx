import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  color: string;
  created_at: string;
}

export function AdminTags() {
  const [tags, setTags] = useState<EmailTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<EmailTag | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    const { data, error } = await supabase
      .from('email_tags')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to load tags');
    } else {
      setTags(data || []);
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
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
        })
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
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
        });

      if (error) {
        toast.error('Failed to create tag');
      } else {
        toast.success('Tag created');
        fetchTags();
      }
    }

    setDialogOpen(false);
    setEditingTag(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag? Users with this tag will have it removed.')) return;

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
    setFormData({ name: tag.name, description: tag.description || '', color: tag.color });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingTag(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setDialogOpen(true);
  }

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

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
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
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
                    <Badge style={{ backgroundColor: tag.color, color: 'white' }}>
                      {tag.name}
                    </Badge>
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
