import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, Menu, Smartphone, User, ChevronRight, Eye, EyeOff, Link2 } from 'lucide-react';

interface MenuItem {
  id: string;
  menu_type: 'desktop' | 'mobile' | 'profile';
  label: string;
  href: string | null;
  icon: string | null;
  parent_id: string | null;
  order_index: number;
  is_visible: boolean;
  requires_auth: boolean;
  requires_admin: boolean;
  sync_with_desktop: boolean;
}

const AVAILABLE_ICONS = [
  'BookOpen', 'Users', 'Brain', 'User', 'Settings', 'Shield', 'Home', 
  'Calendar', 'Music', 'Video', 'FileText', 'MessageSquare', 'Bell',
  'Heart', 'Star', 'Folder', 'Image', 'Mail', 'Phone', 'MapPin'
];

export function AdminMenuEditor() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'profile'>('desktop');
  const [formData, setFormData] = useState({
    label: '',
    href: '',
    icon: '',
    parent_id: '',
    is_visible: true,
    requires_auth: false,
    requires_admin: false,
    sync_with_desktop: false
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  async function fetchMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('order_index');
    
    if (error) {
      toast.error('Failed to load menu items');
    } else {
      setMenuItems((data || []) as MenuItem[]);
    }
    setLoading(false);
  }

  function getItemsForTab(tab: 'desktop' | 'mobile' | 'profile') {
    return menuItems
      .filter(item => item.menu_type === tab && !item.parent_id)
      .sort((a, b) => a.order_index - b.order_index);
  }

  function getChildItems(parentId: string) {
    return menuItems
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async function handleSave() {
    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }

    const payload = {
      menu_type: activeTab,
      label: formData.label.trim(),
      href: formData.href.trim() || null,
      icon: formData.icon || null,
      parent_id: formData.parent_id || null,
      is_visible: formData.is_visible,
      requires_auth: formData.requires_auth,
      requires_admin: formData.requires_admin,
      sync_with_desktop: activeTab === 'mobile' ? formData.sync_with_desktop : false,
      order_index: editingItem?.order_index ?? getItemsForTab(activeTab).length
    };

    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', editingItem.id);
      
      if (error) {
        toast.error('Failed to update menu item');
      } else {
        toast.success('Menu item updated');
        
        // If sync_with_desktop changed, sync mobile items
        if (activeTab === 'mobile' && formData.sync_with_desktop) {
          await syncMobileItem(editingItem.id, payload);
        }
        
        fetchMenuItems();
      }
    } else {
      const { data: newItem, error } = await supabase
        .from('menu_items')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        toast.error('Failed to create menu item');
      } else {
        toast.success('Menu item created');
        
        // Auto-create corresponding mobile item if creating desktop item
        if (activeTab === 'desktop' && newItem) {
          const typedNewItem = newItem as unknown as MenuItem;
          await createMobileMirror(typedNewItem);
        }
        
        fetchMenuItems();
      }
    }

    setDialogOpen(false);
    resetForm();
  }

  async function createMobileMirror(desktopItem: MenuItem) {
    // Check if there's already a mobile item with sync_with_desktop that matches
    const existingMobile = menuItems.find(
      m => m.menu_type === 'mobile' && m.label === desktopItem.label && m.sync_with_desktop
    );
    
    if (existingMobile) return;

    // Create a mobile mirror
    await supabase.from('menu_items').insert({
      menu_type: 'mobile',
      label: desktopItem.label,
      href: desktopItem.href,
      icon: desktopItem.icon,
      order_index: desktopItem.order_index,
      is_visible: desktopItem.is_visible,
      requires_auth: desktopItem.requires_auth,
      requires_admin: desktopItem.requires_admin,
      sync_with_desktop: true
    });
  }

  async function syncMobileItem(mobileItemId: string, payload: any) {
    // Find the corresponding desktop item and sync
    const desktopItem = menuItems.find(
      d => d.menu_type === 'desktop' && d.label === payload.label
    );
    
    if (desktopItem) {
      await supabase.from('menu_items').update({
        href: desktopItem.href,
        icon: desktopItem.icon,
        is_visible: desktopItem.is_visible,
        requires_auth: desktopItem.requires_auth,
        requires_admin: desktopItem.requires_admin
      }).eq('id', mobileItemId);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this menu item and all its sub-items?')) return;

    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    
    if (error) {
      toast.error('Failed to delete menu item');
    } else {
      toast.success('Menu item deleted');
      fetchMenuItems();
    }
  }

  async function handleMoveUp(item: MenuItem) {
    const siblings = item.parent_id 
      ? getChildItems(item.parent_id)
      : getItemsForTab(item.menu_type as any);
    
    const currentIndex = siblings.findIndex(s => s.id === item.id);
    if (currentIndex <= 0) return;

    const prevItem = siblings[currentIndex - 1];
    
    await Promise.all([
      supabase.from('menu_items').update({ order_index: item.order_index - 1 }).eq('id', item.id),
      supabase.from('menu_items').update({ order_index: prevItem.order_index + 1 }).eq('id', prevItem.id)
    ]);
    
    fetchMenuItems();
  }

  async function handleMoveDown(item: MenuItem) {
    const siblings = item.parent_id 
      ? getChildItems(item.parent_id)
      : getItemsForTab(item.menu_type as any);
    
    const currentIndex = siblings.findIndex(s => s.id === item.id);
    if (currentIndex >= siblings.length - 1) return;

    const nextItem = siblings[currentIndex + 1];
    
    await Promise.all([
      supabase.from('menu_items').update({ order_index: item.order_index + 1 }).eq('id', item.id),
      supabase.from('menu_items').update({ order_index: nextItem.order_index - 1 }).eq('id', nextItem.id)
    ]);
    
    fetchMenuItems();
  }

  async function toggleVisibility(item: MenuItem) {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_visible: !item.is_visible })
      .eq('id', item.id);
    
    if (error) {
      toast.error('Failed to update visibility');
    } else {
      fetchMenuItems();
    }
  }

  async function syncFromDesktop() {
    // Get all desktop items
    const desktopItems = menuItems.filter(m => m.menu_type === 'desktop');
    
    // Get mobile items marked for sync
    const syncedMobileItems = menuItems.filter(
      m => m.menu_type === 'mobile' && m.sync_with_desktop
    );

    let updated = 0;
    for (const mobileItem of syncedMobileItems) {
      const desktopMatch = desktopItems.find(d => d.label === mobileItem.label);
      if (desktopMatch) {
        await supabase.from('menu_items').update({
          href: desktopMatch.href,
          icon: desktopMatch.icon,
          is_visible: desktopMatch.is_visible
        }).eq('id', mobileItem.id);
        updated++;
      }
    }

    toast.success(`Synced ${updated} mobile items from desktop`);
    fetchMenuItems();
  }

  function resetForm() {
    setEditingItem(null);
    setFormData({
      label: '',
      href: '',
      icon: '',
      parent_id: '',
      is_visible: true,
      requires_auth: false,
      requires_admin: false,
      sync_with_desktop: false
    });
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setFormData({
      label: item.label,
      href: item.href || '',
      icon: item.icon || '',
      parent_id: item.parent_id || '',
      is_visible: item.is_visible,
      requires_auth: item.requires_auth,
      requires_admin: item.requires_admin,
      sync_with_desktop: item.sync_with_desktop
    });
    setDialogOpen(true);
  }

  function openNew(parentId?: string) {
    resetForm();
    if (parentId) {
      setFormData(prev => ({ ...prev, parent_id: parentId }));
    }
    setDialogOpen(true);
  }

  function renderMenuItem(item: MenuItem, isChild = false) {
    const children = getChildItems(item.id);
    
    return (
      <div key={item.id}>
        <TableRow className={isChild ? 'bg-muted/30' : ''}>
          <TableCell className="w-8">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {isChild && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className={!item.is_visible ? 'text-muted-foreground line-through' : ''}>
                {item.label}
              </span>
              {item.sync_with_desktop && (
                <Badge variant="outline" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  synced
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground text-sm">
            {item.href || '(dropdown)'}
          </TableCell>
          <TableCell>
            {item.icon && <Badge variant="secondary">{item.icon}</Badge>}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              {item.requires_auth && <Badge variant="outline">Auth</Badge>}
              {item.requires_admin && <Badge variant="destructive">Admin</Badge>}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => toggleVisibility(item)}>
                {item.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleMoveUp(item)}>
                ↑
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleMoveDown(item)}>
                ↓
              </Button>
              {!isChild && !item.href && (
                <Button variant="ghost" size="icon" onClick={() => openNew(item.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {children.map(child => renderMenuItem(child, true))}
      </div>
    );
  }

  const tabIcon = {
    desktop: <Menu className="h-4 w-4" />,
    mobile: <Smartphone className="h-4 w-4" />,
    profile: <User className="h-4 w-4" />
  };

  const parentOptions = menuItems.filter(
    m => m.menu_type === activeTab && !m.parent_id && !m.href
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Menu Editor
            </CardTitle>
            <CardDescription>
              Configure navigation menus for desktop, mobile, and profile dropdown
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="desktop" className="gap-2">
                {tabIcon.desktop} Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-2">
                {tabIcon.mobile} Mobile
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                {tabIcon.profile} Profile
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {activeTab === 'mobile' && (
                <Button variant="outline" onClick={syncFromDesktop}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Sync from Desktop
                </Button>
              )}
              <Button onClick={() => openNew()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {['desktop', 'mobile', 'profile'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : getItemsForTab(tab as any).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No menu items. Click "Add Item" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getItemsForTab(tab as any).map(item => renderMenuItem(item))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Dashboard"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={formData.href}
                  onChange={(e) => setFormData(prev => ({ ...prev, href: e.target.value }))}
                  placeholder="e.g., /dashboard (leave empty for dropdown parent)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to create a dropdown menu parent
                </p>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {AVAILABLE_ICONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {parentOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Parent Item</Label>
                  <Select value={formData.parent_id} onValueChange={(v) => setFormData(prev => ({ ...prev, parent_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Top level (no parent)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Top level</SelectItem>
                      {parentOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Visible</Label>
                <Switch
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_visible: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Requires Login</Label>
                <Switch
                  checked={formData.requires_auth}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_auth: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Admin Only</Label>
                <Switch
                  checked={formData.requires_admin}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_admin: checked }))}
                />
              </div>

              {activeTab === 'mobile' && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sync with Desktop</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically match desktop changes
                    </p>
                  </div>
                  <Switch
                    checked={formData.sync_with_desktop}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_with_desktop: checked }))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
