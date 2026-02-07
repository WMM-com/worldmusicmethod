import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ListIcon, Users } from 'lucide-react';

interface EmailList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
}

export function AdminLists() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    const { data, error } = await supabase
      .from('email_lists')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to load lists');
      setLoading(false);
      return;
    }

    // Get member counts
    const listsWithCounts = await Promise.all(
      (data || []).map(async (list) => {
        const { count } = await supabase
          .from('email_list_members')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);
        return { ...list, member_count: count || 0 };
      })
    );

    setLists(listsWithCounts);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('List name is required');
      return;
    }

    if (editingList) {
      const { error } = await supabase
        .from('email_lists')
        .update({ 
          name: formData.name.trim(), 
          description: formData.description.trim() || null 
        })
        .eq('id', editingList.id);

      if (error) {
        toast.error('Failed to update list');
      } else {
        toast.success('List updated');
        fetchLists();
      }
    } else {
      const { error } = await supabase
        .from('email_lists')
        .insert({ 
          name: formData.name.trim(), 
          description: formData.description.trim() || null 
        });

      if (error) {
        toast.error('Failed to create list');
      } else {
        toast.success('List created');
        fetchLists();
      }
    }

    setDialogOpen(false);
    setEditingList(null);
    setFormData({ name: '', description: '' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this list? All memberships will be removed.')) return;

    const { error } = await supabase.from('email_lists').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete list');
    } else {
      toast.success('List deleted');
      fetchLists();
    }
  }

  function openEdit(list: EmailList) {
    setEditingList(list);
    setFormData({ name: list.name, description: list.description || '' });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingList(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListIcon className="h-5 w-5" />
              Email Lists
            </CardTitle>
            <CardDescription>
              Create and manage subscriber lists for targeted campaigns
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingList ? 'Edit List' : 'Create List'}</DialogTitle>
                <DialogDescription>
                  Lists help you organize contacts for targeted email campaigns
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">List Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Newsletter Subscribers"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What this list is for..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingList ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : lists.length === 0 ? (
          <p className="text-muted-foreground">No lists created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>List</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map(list => (
                <TableRow key={list.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">
                      {list.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {list.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {list.member_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(list.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(list)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(list.id)}>
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
