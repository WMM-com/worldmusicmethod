import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FormInput, Copy, Code } from 'lucide-react';

interface OptinForm {
  id: string;
  name: string;
  heading: string | null;
  description: string | null;
  button_text: string;
  success_message: string;
  redirect_url: string | null;
  tags_to_assign: string[];
  sequence_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface EmailTag {
  id: string;
  name: string;
  color: string;
}

interface EmailSequence {
  id: string;
  name: string;
}

export function AdminOptinForms() {
  const [forms, setForms] = useState<OptinForm[]>([]);
  const [tags, setTags] = useState<EmailTag[]>([]);
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<OptinForm | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    heading: '', 
    description: '',
    button_text: 'Subscribe',
    success_message: 'Thank you for subscribing!',
    redirect_url: '',
    tags_to_assign: [] as string[],
    sequence_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [formsRes, tagsRes, seqRes] = await Promise.all([
      supabase.from('optin_forms').select('*').order('name'),
      supabase.from('email_tags').select('id, name, color').order('name'),
      supabase.from('email_sequences').select('id, name').eq('trigger_type', 'form_submit').order('name')
    ]);
    
    if (formsRes.error) toast.error('Failed to load forms');
    
    setForms((formsRes.data || []) as OptinForm[]);
    setTags(tagsRes.data || []);
    setSequences(seqRes.data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('Form name is required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      heading: formData.heading.trim() || null,
      description: formData.description.trim() || null,
      button_text: formData.button_text.trim() || 'Subscribe',
      success_message: formData.success_message.trim() || 'Thank you!',
      redirect_url: formData.redirect_url.trim() || null,
      tags_to_assign: formData.tags_to_assign,
      sequence_id: formData.sequence_id || null,
      is_active: formData.is_active,
    };

    if (editingForm) {
      const { error } = await supabase
        .from('optin_forms')
        .update(payload)
        .eq('id', editingForm.id);

      if (error) {
        toast.error('Failed to update form');
      } else {
        toast.success('Form updated');
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('optin_forms')
        .insert(payload);

      if (error) {
        toast.error('Failed to create form');
      } else {
        toast.success('Form created');
        fetchData();
      }
    }

    setDialogOpen(false);
    setEditingForm(null);
    resetForm();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this form?')) return;

    const { error } = await supabase.from('optin_forms').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete form');
    } else {
      toast.success('Form deleted');
      fetchData();
    }
  }

  function resetForm() {
    setFormData({ 
      name: '', 
      heading: '', 
      description: '',
      button_text: 'Subscribe',
      success_message: 'Thank you for subscribing!',
      redirect_url: '',
      tags_to_assign: [],
      sequence_id: '',
      is_active: true
    });
  }

  function openEdit(form: OptinForm) {
    setEditingForm(form);
    setFormData({ 
      name: form.name, 
      heading: form.heading || '', 
      description: form.description || '',
      button_text: form.button_text,
      success_message: form.success_message,
      redirect_url: form.redirect_url || '',
      tags_to_assign: form.tags_to_assign || [],
      sequence_id: form.sequence_id || '',
      is_active: form.is_active
    });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingForm(null);
    resetForm();
    setDialogOpen(true);
  }

  function showEmbed(formId: string) {
    setSelectedFormId(formId);
    setEmbedDialogOpen(true);
  }

  function copyEmbedCode() {
    const code = `<OptinFormEmbed formId="${selectedFormId}" />`;
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied');
  }

  function toggleTag(tagId: string) {
    setFormData(prev => ({
      ...prev,
      tags_to_assign: prev.tags_to_assign.includes(tagId)
        ? prev.tags_to_assign.filter(t => t !== tagId)
        : [...prev.tags_to_assign, tagId]
    }));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FormInput className="h-5 w-5" />
              Opt-in Forms
            </CardTitle>
            <CardDescription>
              Create embeddable forms to capture leads and trigger sequences
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingForm ? 'Edit Form' : 'Create Form'}</DialogTitle>
                <DialogDescription>
                  Configure your opt-in form settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Form Name (internal)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Homepage Newsletter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={formData.button_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                      placeholder="Subscribe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Heading (optional)</Label>
                  <Input
                    value={formData.heading}
                    onChange={(e) => setFormData(prev => ({ ...prev, heading: e.target.value }))}
                    placeholder="Join our newsletter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Get the latest updates..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Success Message</Label>
                  <Input
                    value={formData.success_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, success_message: e.target.value }))}
                    placeholder="Thank you for subscribing!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Redirect URL (optional)</Label>
                  <Input
                    value={formData.redirect_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, redirect_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tags to assign on submission</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={formData.tags_to_assign.includes(tag.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        style={formData.tags_to_assign.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No tags available</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Sequence (optional)</Label>
                  <Select 
                    value={formData.sequence_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, sequence_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No sequence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No sequence</SelectItem>
                      {sequences.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
                  />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingForm ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : forms.length === 0 ? (
          <p className="text-muted-foreground">No forms created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map(form => (
                <TableRow key={form.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{form.name}</p>
                      {form.heading && (
                        <p className="text-xs text-muted-foreground">{form.heading}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {form.tags_to_assign.slice(0, 3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <Badge key={tagId} variant="secondary" style={{ backgroundColor: tag.color, color: 'white' }}>
                            {tag.name}
                          </Badge>
                        ) : null;
                      })}
                      {form.tags_to_assign.length > 3 && (
                        <Badge variant="outline">+{form.tags_to_assign.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={form.is_active ? 'default' : 'outline'}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => showEmbed(form.id)}>
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(form)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(form.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Form</DialogTitle>
            <DialogDescription>
              Use this component to embed the form on any page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm">
              {`<OptinFormEmbed formId="${selectedFormId}" />`}
            </div>
            <p className="text-sm text-muted-foreground">
              Import the component from @/components/forms/OptinFormEmbed
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedDialogOpen(false)}>Close</Button>
            <Button onClick={copyEmbedCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
