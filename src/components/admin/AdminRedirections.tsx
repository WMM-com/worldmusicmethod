import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink, ArrowRight } from 'lucide-react';
import { z } from 'zod';

interface Redirection {
  id: string;
  source_url: string;
  target_url: string;
  status_code: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const redirectionSchema = z.object({
  source_url: z.string()
    .min(1, 'Source URL is required')
    .max(500, 'Source URL must be less than 500 characters')
    .refine(val => val.startsWith('/'), 'Source URL must start with /'),
  target_url: z.string()
    .min(1, 'Target URL is required')
    .max(500, 'Target URL must be less than 500 characters')
    .refine(
      val => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
      'Target URL must start with / or be a full URL'
    ),
  status_code: z.number().refine(val => [301, 302, 307, 308].includes(val), 'Invalid status code'),
  is_active: z.boolean(),
});

type RedirectionForm = z.infer<typeof redirectionSchema>;

const STATUS_CODES = [
  { value: 301, label: '301 - Permanent Redirect' },
  { value: 302, label: '302 - Temporary Redirect' },
  { value: 307, label: '307 - Temporary Redirect (preserve method)' },
  { value: 308, label: '308 - Permanent Redirect (preserve method)' },
];

export function AdminRedirections() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirection | null>(null);
  const [formData, setFormData] = useState<RedirectionForm>({
    source_url: '',
    target_url: '',
    status_code: 301,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all redirections (admins can see all)
  const { data: redirections, isLoading } = useQuery({
    queryKey: ['admin-redirections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redirections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Redirection[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RedirectionForm) => {
      const { error } = await supabase
        .from('redirections')
        .insert({
          source_url: data.source_url,
          target_url: data.target_url,
          status_code: data.status_code,
          is_active: data.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redirections'] });
      queryClient.invalidateQueries({ queryKey: ['redirections'] });
      toast.success('Redirect created successfully');
      closeDialog();
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast.error('A redirect with this source URL already exists');
      } else {
        toast.error('Failed to create redirect');
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RedirectionForm }) => {
      const { error } = await supabase
        .from('redirections')
        .update({
          source_url: data.source_url,
          target_url: data.target_url,
          status_code: data.status_code,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redirections'] });
      queryClient.invalidateQueries({ queryKey: ['redirections'] });
      toast.success('Redirect updated successfully');
      closeDialog();
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast.error('A redirect with this source URL already exists');
      } else {
        toast.error('Failed to update redirect');
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('redirections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redirections'] });
      queryClient.invalidateQueries({ queryKey: ['redirections'] });
      toast.success('Redirect deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete redirect');
    },
  });

  const openCreateDialog = () => {
    setEditingRedirect(null);
    setFormData({
      source_url: '',
      target_url: '',
      status_code: 301,
      is_active: true,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (redirect: Redirection) => {
    setEditingRedirect(redirect);
    setFormData({
      source_url: redirect.source_url,
      target_url: redirect.target_url,
      status_code: redirect.status_code,
      is_active: redirect.is_active,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRedirect(null);
    setFormData({
      source_url: '',
      target_url: '',
      status_code: 301,
      is_active: true,
    });
    setErrors({});
  };

  const handleSubmit = () => {
    const result = redirectionSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (editingRedirect) {
      updateMutation.mutate({ id: editingRedirect.id, data: result.data });
    } else {
      createMutation.mutate(result.data);
    }
  };

  const isExternal = (url: string) => url.startsWith('http://') || url.startsWith('https://');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>URL Redirections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>URL Redirections</CardTitle>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Redirect
        </Button>
      </CardHeader>
      <CardContent>
        {redirections?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No redirections configured. Click "Add Redirect" to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source URL</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Target URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redirections?.map((redirect) => (
                  <TableRow key={redirect.id}>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      {redirect.source_url}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      <span className="flex items-center gap-1">
                        {redirect.target_url}
                        {isExternal(redirect.target_url) && (
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{redirect.status_code}</TableCell>
                    <TableCell>
                      <Switch
                        checked={redirect.is_active}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({
                            id: redirect.id,
                            data: { ...redirect, is_active: checked },
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(redirect)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Redirect</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this redirect from{' '}
                                <code className="bg-muted px-1 rounded">{redirect.source_url}</code>?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(redirect.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRedirect ? 'Edit Redirect' : 'Create Redirect'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="source_url">Source URL</Label>
                <Input
                  id="source_url"
                  placeholder="/old-page"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  className={errors.source_url ? 'border-destructive' : ''}
                />
                {errors.source_url && (
                  <p className="text-sm text-destructive">{errors.source_url}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The path to redirect from (must start with /)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_url">Target URL</Label>
                <Input
                  id="target_url"
                  placeholder="/new-page or https://example.com"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  className={errors.target_url ? 'border-destructive' : ''}
                />
                {errors.target_url && (
                  <p className="text-sm text-destructive">{errors.target_url}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The destination path or full URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_code">Status Code</Label>
                <Select
                  value={formData.status_code.toString()}
                  onValueChange={(val) => setFormData({ ...formData, status_code: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CODES.map((code) => (
                      <SelectItem key={code.value} value={code.value.toString()}>
                        {code.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingRedirect ? 'Save Changes' : 'Create Redirect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
