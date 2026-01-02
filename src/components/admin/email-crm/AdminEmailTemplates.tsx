import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  created_at: string;
}

export function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    subject: '', 
    body_html: '',
    body_text: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from('email_sequence_templates')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to load templates');
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body_html.trim()) {
      toast.error('Name, subject, and body are required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      body_html: formData.body_html,
      body_text: formData.body_text.trim() || null,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('email_sequence_templates')
        .update(payload)
        .eq('id', editingTemplate.id);

      if (error) {
        toast.error('Failed to update template');
      } else {
        toast.success('Template updated');
        fetchTemplates();
      }
    } else {
      const { error } = await supabase
        .from('email_sequence_templates')
        .insert(payload);

      if (error) {
        toast.error('Failed to create template');
      } else {
        toast.success('Template created');
        fetchTemplates();
      }
    }

    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', body_html: '', body_text: '' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;

    const { error } = await supabase.from('email_sequence_templates').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete template - it may be in use by a sequence');
    } else {
      toast.success('Template deleted');
      fetchTemplates();
    }
  }

  function openEdit(template: EmailTemplate) {
    setEditingTemplate(template);
    setFormData({ 
      name: template.name, 
      subject: template.subject, 
      body_html: template.body_html,
      body_text: template.body_text || ''
    });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', body_html: '', body_text: '' });
    setDialogOpen(true);
  }

  function openPreview(template: EmailTemplate) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  const variableHints = [
    '{{first_name}} - Contact first name',
    '{{email}} - Contact email',
    '{{course_name}} - Course name (for cart/purchase)',
    '{{cart_items}} - List of cart items',
    '{{checkout_url}} - Link to checkout',
    '{{unsubscribe_url}} - Unsubscribe link',
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <CardDescription>
              Create reusable email templates for your sequences
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                <DialogDescription>
                  Create an email template with HTML content
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Welcome to World Music Method!"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>HTML Body</Label>
                  <Textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                    placeholder="<html>...</html>"
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plain Text Version (optional)</Label>
                  <Textarea
                    value={formData.body_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, body_text: e.target.value }))}
                    placeholder="Plain text fallback..."
                    rows={4}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Available Variables:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {variableHints.map(hint => (
                      <p key={hint}>{hint}</p>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingTemplate ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground">No templates created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(template => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground">{template.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openPreview(template)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewTemplate?.body_html || '') }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
