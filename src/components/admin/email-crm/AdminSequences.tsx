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
import { Plus, Pencil, Trash2, Mail, Settings, Play, Pause } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface OptinForm {
  id: string;
  name: string;
}

interface EmailTag {
  id: string;
  name: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: { product_ids?: string[]; form_id?: string; tag_id?: string } | null;
  is_active: boolean;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  template_id: string;
  step_order: number;
  delay_minutes: number;
  template?: EmailTemplate;
}

export function AdminSequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [optinForms, setOptinForms] = useState<OptinForm[]>([]);
  const [emailTags, setEmailTags] = useState<EmailTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stepsDialogOpen, setStepsDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    trigger_type: 'form_submit',
    product_ids: [] as string[],
    form_id: '',
    tag_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [seqRes, tempRes, prodRes, formsRes, tagsRes] = await Promise.all([
      supabase.from('email_sequences').select('*').order('name'),
      supabase.from('email_sequence_templates').select('id, name, subject').order('name'),
      supabase.from('products').select('id, name').eq('is_active', true).order('name'),
      supabase.from('optin_forms').select('id, name').order('name'),
      supabase.from('email_tags').select('id, name').order('name')
    ]);
    
    if (seqRes.error) toast.error('Failed to load sequences');
    
    setSequences((seqRes.data || []) as EmailSequence[]);
    setTemplates(tempRes.data || []);
    setProducts(prodRes.data || []);
    setOptinForms(formsRes.data || []);
    setEmailTags(tagsRes.data || []);
    setLoading(false);
  }

  async function fetchSteps(sequenceId: string) {
    const { data, error } = await supabase
      .from('email_sequence_steps')
      .select('*, template:email_sequence_templates(id, name, subject)')
      .eq('sequence_id', sequenceId)
      .order('step_order');
    
    if (error) {
      toast.error('Failed to load steps');
    } else {
      setSteps((data || []).map(s => ({
        ...s,
        template: s.template as unknown as EmailTemplate
      })));
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('Sequence name is required');
      return;
    }

    const triggerConfig: { product_ids?: string[]; form_id?: string; tag_id?: string } = {};
    if (formData.trigger_type === 'purchase' && formData.product_ids.length > 0) {
      triggerConfig.product_ids = formData.product_ids;
    }
    if (formData.trigger_type === 'form_submit' && formData.form_id) {
      triggerConfig.form_id = formData.form_id;
    }
    if (formData.trigger_type === 'tag_added' && formData.tag_id) {
      triggerConfig.tag_id = formData.tag_id;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      trigger_type: formData.trigger_type,
      trigger_config: triggerConfig,
      is_active: formData.is_active,
    };

    if (editingSequence) {
      const { error } = await supabase
        .from('email_sequences')
        .update(payload)
        .eq('id', editingSequence.id);

      if (error) {
        toast.error('Failed to update sequence');
      } else {
        toast.success('Sequence updated');
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('email_sequences')
        .insert(payload);

      if (error) {
        toast.error('Failed to create sequence');
      } else {
        toast.success('Sequence created');
        fetchData();
      }
    }

    setDialogOpen(false);
    setEditingSequence(null);
    setFormData({ name: '', description: '', trigger_type: 'form_submit', product_ids: [], form_id: '', tag_id: '', is_active: true });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sequence?')) return;
    const { error } = await supabase.from('email_sequences').delete().eq('id', id);
    if (error) toast.error('Failed to delete sequence');
    else { toast.success('Sequence deleted'); fetchData(); }
  }

  async function toggleActive(sequence: EmailSequence) {
    const { error } = await supabase
      .from('email_sequences')
      .update({ is_active: !sequence.is_active })
      .eq('id', sequence.id);
    if (!error) fetchData();
  }

  async function addStep(templateId: string, delayMinutes: number) {
    if (!selectedSequence) return;
    const { error } = await supabase
      .from('email_sequence_steps')
      .insert({
        sequence_id: selectedSequence.id,
        template_id: templateId,
        step_order: steps.length + 1,
        delay_minutes: delayMinutes,
      });
    if (error) toast.error('Failed to add step');
    else fetchSteps(selectedSequence.id);
  }

  async function deleteStep(stepId: string) {
    const { error } = await supabase.from('email_sequence_steps').delete().eq('id', stepId);
    if (!error && selectedSequence) fetchSteps(selectedSequence.id);
  }

  function openEdit(sequence: EmailSequence) {
    setEditingSequence(sequence);
    const config = sequence.trigger_config || {};
    setFormData({ 
      name: sequence.name, 
      description: sequence.description || '', 
      trigger_type: sequence.trigger_type,
      product_ids: config.product_ids || [],
      form_id: config.form_id || '',
      tag_id: config.tag_id || '',
      is_active: sequence.is_active
    });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingSequence(null);
    setFormData({ name: '', description: '', trigger_type: 'form_submit', product_ids: [], form_id: '', tag_id: '', is_active: true });
    setDialogOpen(true);
  }

  function openSteps(sequence: EmailSequence) {
    setSelectedSequence(sequence);
    fetchSteps(sequence.id);
    setStepsDialogOpen(true);
  }

  function toggleProduct(productId: string) {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  }

  const triggerTypes = [
    { value: 'form_submit', label: 'Form Submission' },
    { value: 'purchase', label: 'Purchase Completed' },
    { value: 'tag_added', label: 'Tag Added' },
    { value: 'cart_abandonment', label: 'Cart Abandonment' },
  ];

  function formatDelay(minutes: number): string {
    if (minutes === 0) return 'Immediately';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hr`;
    return `${Math.round(minutes / 1440)} days`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Email Sequences</CardTitle>
            <CardDescription>Create automated email sequences triggered by actions</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Sequence</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSequence ? 'Edit Sequence' : 'Create Sequence'}</DialogTitle>
                <DialogDescription>Set up an automated email sequence</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Welcome Series" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={formData.trigger_type} onValueChange={(v) => setFormData(prev => ({ ...prev, trigger_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.trigger_type === 'form_submit' && (
                  <div className="space-y-2">
                    <Label>Trigger for form (optional)</Label>
                    <Select 
                      value={formData.form_id} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, form_id: v === 'all' ? '' : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="All forms" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Forms</SelectItem>
                        {optinForms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.form_id ? 'Triggers for specific form' : 'Triggers for ANY form submission'}
                    </p>
                  </div>
                )}

                {formData.trigger_type === 'tag_added' && (
                  <div className="space-y-2">
                    <Label>Trigger when tag is added</Label>
                    <Select 
                      value={formData.tag_id} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, tag_id: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select tag..." /></SelectTrigger>
                      <SelectContent>
                        {emailTags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!formData.tag_id && <p className="text-xs text-destructive">Please select a tag</p>}
                  </div>
                )}

                {formData.trigger_type === 'purchase' && (
                  <div className="space-y-2">
                    <Label>Trigger for products (leave empty for all)</Label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                      {products.map(product => (
                        <Badge
                          key={product.id}
                          variant={formData.product_ids.includes(product.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleProduct(product.id)}
                        >
                          {product.name}
                        </Badge>
                      ))}
                      {products.length === 0 && <p className="text-sm text-muted-foreground">No products</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.product_ids.length === 0 ? 'Triggers for ALL product purchases' : `Triggers for ${formData.product_ids.length} selected product(s)`}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingSequence ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sequences.length === 0 ? (
          <p className="text-muted-foreground">No sequences created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map(seq => (
                <TableRow key={seq.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{seq.name}</p>
                      {seq.description && <p className="text-xs text-muted-foreground">{seq.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {triggerTypes.find(t => t.value === seq.trigger_type)?.label || seq.trigger_type}
                    </Badge>
                    {seq.trigger_type === 'purchase' && seq.trigger_config?.product_ids?.length ? (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({seq.trigger_config.product_ids.length} products)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={seq.is_active ? 'default' : 'outline'}>
                      {seq.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(seq)}>
                      {seq.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openSteps(seq)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(seq)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(seq.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Steps Dialog */}
      <Dialog open={stepsDialogOpen} onOpenChange={setStepsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sequence Steps: {selectedSequence?.name}</DialogTitle>
            <DialogDescription>Add emails to send in this sequence</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {steps.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No steps yet</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-medium">{step.template?.name || 'Unknown template'}</p>
                      <p className="text-xs text-muted-foreground">
                        Send {formatDelay(step.delay_minutes)} after {idx === 0 ? 'trigger' : 'previous email'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteStep(step.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {templates.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Add Step</p>
                <Select onValueChange={(templateId) => addStep(templateId, steps.length === 0 ? 0 : 1440)}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">First step sends immediately, subsequent steps wait 24 hours</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
