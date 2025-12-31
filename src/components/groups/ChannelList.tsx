import { useState } from 'react';
import { 
  MessageCircle, Hash, Megaphone, FileText, HelpCircle, 
  Plus, Settings, Trash2, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGroupChannels, useCreateChannel, useDeleteChannel, type GroupChannel } from '@/hooks/useGroupChannels';
import { cn } from '@/lib/utils';

const CHANNEL_ICONS = [
  { value: 'message-circle', label: 'Chat', Icon: MessageCircle },
  { value: 'hash', label: 'General', Icon: Hash },
  { value: 'megaphone', label: 'Announcements', Icon: Megaphone },
  { value: 'file-text', label: 'Resources', Icon: FileText },
  { value: 'help-circle', label: 'Help', Icon: HelpCircle },
];

function getIconComponent(iconName: string) {
  const iconConfig = CHANNEL_ICONS.find(i => i.value === iconName);
  return iconConfig?.Icon || MessageCircle;
}

interface ChannelListProps {
  groupId: string;
  isAdmin: boolean;
  selectedChannelId: string | undefined;
  onSelectChannel: (channelId: string | undefined) => void;
}

export function ChannelList({ groupId, isAdmin, selectedChannelId, onSelectChannel }: ChannelListProps) {
  const { data: channels = [] } = useGroupChannels(groupId);
  const deleteChannel = useDeleteChannel();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Channels
        </span>
        {isAdmin && (
          <CreateChannelDialog 
            groupId={groupId} 
            open={createOpen} 
            onOpenChange={setCreateOpen}
          />
        )}
      </div>

      {/* All Posts option */}
      <button
        onClick={() => onSelectChannel(undefined)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
          selectedChannelId === undefined 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <Hash className="h-4 w-4" />
        <span>All Posts</span>
      </button>

      {/* Channel list */}
      {channels.map((channel) => {
        const IconComponent = getIconComponent(channel.icon);
        const isSelected = selectedChannelId === channel.id;
        
        return (
          <div key={channel.id} className="group relative">
            <button
              onClick={() => onSelectChannel(channel.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                isSelected 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <IconComponent className="h-4 w-4" />
              <span className="flex-1 text-left truncate">{channel.name}</span>
            </button>
            
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{channel.name}"? Posts in this channel will be moved to the general feed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteChannel.mutate({ channelId: channel.id, groupId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      })}

      {channels.length === 0 && isAdmin && (
        <p className="text-xs text-muted-foreground px-2 py-1">
          Create channels to organize discussions
        </p>
      )}
    </div>
  );
}

interface CreateChannelDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateChannelDialog({ groupId, open, onOpenChange }: CreateChannelDialogProps) {
  const createChannel = useCreateChannel();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('message-circle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createChannel.mutateAsync({
      group_id: groupId,
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
    });

    setName('');
    setDescription('');
    setIcon('message-circle');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., course-feedback"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_ICONS.map((iconOption) => (
                  <SelectItem key={iconOption.value} value={iconOption.value}>
                    <div className="flex items-center gap-2">
                      <iconOption.Icon className="h-4 w-4" />
                      <span>{iconOption.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel for?"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createChannel.isPending || !name.trim()}>
              {createChannel.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
