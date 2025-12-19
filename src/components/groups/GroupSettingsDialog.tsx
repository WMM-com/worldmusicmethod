import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Image, Video, Music, BarChart3, Calendar, Users, Shield, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Group, GroupSettings, WhoCanPost } from '@/types/groups';

interface GroupSettingsDialogProps {
  group: Group;
  trigger?: React.ReactNode;
}

const DEFAULT_SETTINGS: GroupSettings = {
  who_can_post: 'all_members',
  allow_polls: true,
  allow_events: true,
  allow_images: true,
  allow_videos: true,
  allow_audio: true,
  require_post_approval: false,
  allow_member_invites: false,
};

export function GroupSettingsDialog({ group, trigger }: GroupSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  
  // Group info
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [rules, setRules] = useState(group.rules || '');
  const [welcomeMessage, setWelcomeMessage] = useState(group.welcome_message || '');
  
  // Settings
  const [settings, setSettings] = useState<GroupSettings>(
    (group.settings as GroupSettings) || DEFAULT_SETTINGS
  );
  
  useEffect(() => {
    if (open) {
      setName(group.name);
      setDescription(group.description || '');
      setRules(group.rules || '');
      setWelcomeMessage(group.welcome_message || '');
      setSettings((group.settings as GroupSettings) || DEFAULT_SETTINGS);
    }
  }, [open, group]);
  
  const updateSetting = <K extends keyof GroupSettings>(key: K, value: GroupSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name,
          description: description || null,
          rules: rules || null,
          welcome_message: welcomeMessage || null,
          settings: JSON.parse(JSON.stringify(settings)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', group.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['group', group.id] });
      toast.success('Group settings saved');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Settings
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Basic Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rules">Group Rules</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Set rules for your group members..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Message shown to new members..."
                rows={2}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Posting Permissions */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Posting Permissions
            </h3>
            
            <div className="space-y-2">
              <Label>Who can post?</Label>
              <Select 
                value={settings.who_can_post} 
                onValueChange={(v) => updateSetting('who_can_post', v as WhoCanPost)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">All Members</SelectItem>
                  <SelectItem value="admins_and_moderators">Admins & Moderators</SelectItem>
                  <SelectItem value="admins_only">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require post approval</Label>
                <p className="text-sm text-muted-foreground">
                  Posts must be approved by admins before appearing
                </p>
              </div>
              <Switch
                checked={settings.require_post_approval}
                onCheckedChange={(v) => updateSetting('require_post_approval', v)}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Content Types */}
          <div className="space-y-4">
            <h3 className="font-semibold">Allowed Content Types</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <Label>Images</Label>
                </div>
                <Switch
                  checked={settings.allow_images}
                  onCheckedChange={(v) => updateSetting('allow_images', v)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <Label>Videos</Label>
                </div>
                <Switch
                  checked={settings.allow_videos}
                  onCheckedChange={(v) => updateSetting('allow_videos', v)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <Label>Audio</Label>
                </div>
                <Switch
                  checked={settings.allow_audio}
                  onCheckedChange={(v) => updateSetting('allow_audio', v)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <Label>Polls</Label>
                </div>
                <Switch
                  checked={settings.allow_polls}
                  onCheckedChange={(v) => updateSetting('allow_polls', v)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label>Events</Label>
                </div>
                <Switch
                  checked={settings.allow_events}
                  onCheckedChange={(v) => updateSetting('allow_events', v)}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Membership */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Membership
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow member invites</Label>
                <p className="text-sm text-muted-foreground">
                  Let members invite others to join
                </p>
              </div>
              <Switch
                checked={settings.allow_member_invites}
                onCheckedChange={(v) => updateSetting('allow_member_invites', v)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
