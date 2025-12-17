import { useState } from 'react';
import { useTechSpecs } from '@/hooks/useTechSpecs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { TechSpec } from '@/types/techSpec';
import { StagePlotEditor } from './StagePlotEditor';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TechSpecsTab() {
  const { techSpecs, loading, createTechSpec, updateTechSpec, deleteTechSpec, togglePublicShare } = useTechSpecs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<TechSpec | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<TechSpec | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const spec = await createTechSpec(newName.trim(), newDescription.trim());
    if (spec) {
      setCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');
      setSelectedSpec(spec);
    }
  };

  const handleUpdate = async () => {
    if (!editingSpec || !newName.trim()) return;
    await updateTechSpec(editingSpec.id, {
      name: newName.trim(),
      description: newDescription.trim() || null,
    });
    setEditingSpec(null);
    setNewName('');
    setNewDescription('');
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTechSpec(deleteConfirmId);
    if (selectedSpec?.id === deleteConfirmId) {
      setSelectedSpec(null);
    }
    setDeleteConfirmId(null);
  };

  const copyShareLink = (spec: TechSpec) => {
    const url = `${window.location.origin}/tech-spec/${spec.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(spec.id);
    toast.success('Share link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditDialog = (spec: TechSpec) => {
    setNewName(spec.name);
    setNewDescription(spec.description || '');
    setEditingSpec(spec);
  };

  if (selectedSpec) {
    return (
      <StagePlotEditor
        techSpec={selectedSpec}
        onBack={() => setSelectedSpec(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Tech Specs</h2>
          <p className="text-sm text-muted-foreground">
            Create visual stage plots to share with venues and sound engineers
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Tech Spec
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tech Spec</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Quartet Setup, Solo Acoustic"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this setup..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : techSpecs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No tech specs yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first stage plot to share with venues
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tech Spec
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {techSpecs.map((spec) => (
            <Card key={spec.id} className="group hover:border-secondary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedSpec(spec)}>
                    <CardTitle className="text-lg truncate group-hover:text-secondary transition-colors">
                      {spec.name}
                    </CardTitle>
                    {spec.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {spec.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={spec.is_publicly_shared}
                      onCheckedChange={(checked) => togglePublicShare(spec.id, checked)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {spec.is_publicly_shared ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {spec.is_publicly_shared && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyShareLink(spec)}
                      >
                        {copiedId === spec.id ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(spec)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(spec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingSpec} onOpenChange={(open) => !open && setEditingSpec(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tech Spec</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!newName.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tech Spec?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this tech spec and all its stage plot items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
