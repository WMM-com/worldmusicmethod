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
import { Plus, Pencil, Trash2, FormInput, Copy, Code, GripVertical, X } from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'select' | 'multiselect' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[];
  tagOnValue?: { value: string; tagId: string }[];
}

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
  fields: FormField[];
  created_at: string;
}

interface EmailTag {
  id: string;
  name: string;
}

interface EmailSequence {
  id: string;
  name: string;
}

const defaultFields: FormField[] = [
  { id: 'email', type: 'email', label: 'Email', required: true },
  { id: 'first_name', type: 'text', label: 'First Name', required: false },
];

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
    is_active: true,
    fields: defaultFields as FormField[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [formsRes, tagsRes, seqRes] = await Promise.all([
      supabase.from('optin_forms').select('*').order('name'),
      supabase.from('email_tags').select('id, name').order('name'),
      supabase.from('email_sequences').select('id, name').eq('trigger_type', 'form_submit').order('name')
    ]);
    
    if (formsRes.error) toast.error('Failed to load forms');
    
    const formsData = (formsRes.data || []).map(f => ({
      ...f,
      fields: (f.fields as unknown as FormField[]) || defaultFields
    })) as OptinForm[];
    
    setForms(formsData);
    setTags((tagsRes.data || []) as EmailTag[]);
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
      fields: formData.fields as unknown as any,
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
      is_active: true,
      fields: defaultFields
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
      is_active: form.is_active,
      fields: form.fields || defaultFields
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

  function addField() {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...updates } : f)
    }));
  }

  function removeField(index: number) {
    if (formData.fields[index].id === 'email') {
      toast.error('Email field is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  }

  function addFieldOption(fieldIndex: number) {
    const field = formData.fields[fieldIndex];
    const options = field.options || [];
    updateField(fieldIndex, { options: [...options, 'New Option'] });
  }

  function updateFieldOption(fieldIndex: number, optionIndex: number, value: string) {
    const field = formData.fields[fieldIndex];
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    updateField(fieldIndex, { options });
  }

  function removeFieldOption(fieldIndex: number, optionIndex: number) {
    const field = formData.fields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options });
  }

  function addTagMapping(fieldIndex: number, optionValue: string) {
    const field = formData.fields[fieldIndex];
    const tagOnValue = field.tagOnValue || [];
    updateField(fieldIndex, { 
      tagOnValue: [...tagOnValue, { value: optionValue, tagId: '' }] 
    });
  }

  function updateTagMapping(fieldIndex: number, mappingIndex: number, tagId: string) {
    const field = formData.fields[fieldIndex];
    const tagOnValue = [...(field.tagOnValue || [])];
    tagOnValue[mappingIndex] = { ...tagOnValue[mappingIndex], tagId };
    updateField(fieldIndex, { tagOnValue });
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingForm ? 'Edit Form' : 'Create Form'}</DialogTitle>
                <DialogDescription>
                  Configure your opt-in form settings and fields
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium">Basic Settings</h3>
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
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Form Fields</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.fields.map((field, fieldIndex) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(fieldIndex, { label: e.target.value })}
                              placeholder="Field label"
                            />
                            <Select 
                              value={field.type} 
                              onValueChange={(v) => updateField(fieldIndex, { type: v as FormField['type'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="select">Dropdown (Single)</SelectItem>
                                <SelectItem value="multiselect">Dropdown (Multi)</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(v) => updateField(fieldIndex, { required: v })}
                              />
                              <span className="text-sm">Required</span>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeField(fieldIndex)}
                            disabled={field.id === 'email'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Options for select/multiselect */}
                        {(field.type === 'select' || field.type === 'multiselect') && (
                          <div className="ml-6 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Options</Label>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={() => addFieldOption(fieldIndex)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            {(field.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateFieldOption(fieldIndex, optionIndex, e.target.value)}
                                  placeholder="Option value"
                                  className="flex-1"
                                />
                                <Select
                                  value={field.tagOnValue?.find(t => t.value === option)?.tagId || ''}
                                  onValueChange={(tagId) => {
                                    const existing = field.tagOnValue || [];
                                    const existingIndex = existing.findIndex(t => t.value === option);
                                    if (existingIndex >= 0) {
                                      updateTagMapping(fieldIndex, existingIndex, tagId);
                                    } else {
                                      updateField(fieldIndex, { 
                                        tagOnValue: [...existing, { value: option, tagId }] 
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Assign tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No tag</SelectItem>
                                    {tags.map(tag => (
                                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeFieldOption(fieldIndex, optionIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags to assign on submission</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={formData.tags_to_assign.includes(tag.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
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

                {/* Sequence */}
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
                <TableHead>Fields</TableHead>
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
                    <Badge variant="outline">{form.fields?.length || 0} fields</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {form.tags_to_assign.slice(0, 3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <Badge key={tagId} variant="secondary">
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
