import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lock, Eye, EyeOff } from 'lucide-react';
import { useCreateGroup } from '@/hooks/useGroups';
import { CATEGORY_LABELS, SUBCATEGORIES, type GroupCategory, type GroupPrivacy } from '@/types/groups';

interface CreateGroupDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ trigger }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('other');
  const [subcategory, setSubcategory] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
  const [location, setLocation] = useState('');
  
  const createGroup = useCreateGroup();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createGroup.mutateAsync({
      name,
      description: description || undefined,
      category,
      subcategory: subcategory || undefined,
      privacy,
      location: location || undefined,
    });
    
    setOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('other');
    setSubcategory('');
    setPrivacy('public');
    setLocation('');
  };
  
  const subcategories = SUBCATEGORIES[category] || [];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Jazz Enthusiasts NYC"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v as GroupCategory); setSubcategory(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {subcategories.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select value={subcategory} onValueChange={setSubcategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Privacy</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={privacy === 'public' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setPrivacy('public')}
              >
                <Eye className="h-4 w-4 mb-1" />
                <span className="text-xs">Public</span>
              </Button>
              <Button
                type="button"
                variant={privacy === 'private' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setPrivacy('private')}
              >
                <Lock className="h-4 w-4 mb-1" />
                <span className="text-xs">Private</span>
              </Button>
              <Button
                type="button"
                variant={privacy === 'secret' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setPrivacy('secret')}
              >
                <EyeOff className="h-4 w-4 mb-1" />
                <span className="text-xs">Secret</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {privacy === 'public' && 'Anyone can find and join this group'}
              {privacy === 'private' && 'Anyone can find, but must request to join'}
              {privacy === 'secret' && 'Only invited members can see and join'}
            </p>
          </div>
          
          {category === 'local' && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Los Angeles, CA"
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
