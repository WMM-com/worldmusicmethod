import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Send, Mail, Copy, Users, Loader2 } from 'lucide-react';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  send_to_lists: string[];
  include_tags: string[];
  exclude_tags: string[];
  total_recipients: number;
  sent_count: number;
  created_at: string;
}

interface EmailList {
  id: string;
  name: string;
}

interface EmailTag {
  id: string;
  name: string;
}

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [tags, setTags] = useState<EmailTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    send_to_lists: [] as string[],
    include_tags: [] as string[],
    exclude_tags: [] as string[],
    scheduled_at: ''
  });

  // Recipient count preview state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewEmails, setPreviewEmails] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced recipient count calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.send_to_lists.length > 0 || formData.include_tags.length > 0) {
        calculateRecipientCount();
      } else {
        setRecipientCount(null);
        setPreviewEmails([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.send_to_lists, formData.include_tags, formData.exclude_tags]);

  async function calculateRecipientCount() {
    setLoadingPreview(true);
    try {
      // Create a temporary campaign object for preview
      const tempCampaign = {
        send_to_lists: formData.send_to_lists,
        include_tags: formData.include_tags,
        exclude_tags: formData.exclude_tags,
      };

      // If we have an existing campaign ID, use it, otherwise we need to save first
      if (editingCampaign?.id) {
        const { data, error } = await supabase.functions.invoke('send-email-campaign', {
          body: { campaignId: editingCampaign.id, previewOnly: true }
        });

        if (!error && data) {
          setRecipientCount(data.recipientCount);
          setPreviewEmails(data.recipients || []);
        }
      } else {
        // For new campaigns, we need to calculate locally based on the selected tags
        await calculateLocalRecipientCount();
      }
    } catch (err) {
      console.error('Failed to calculate recipient count:', err);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function calculateLocalRecipientCount() {
    let count = 0;
    const emails: string[] = [];

    // Get contacts from lists
    if (formData.send_to_lists.length > 0) {
      const { data: listMembers } = await supabase
        .from('email_list_members')
        .select('contact:email_contacts(email, is_subscribed)')
        .in('list_id', formData.send_to_lists);

      if (listMembers) {
        for (const member of listMembers) {
          const contact = member.contact as any;
          if (contact && contact.is_subscribed && !emails.includes(contact.email)) {
            emails.push(contact.email);
          }
        }
      }
    }

    // Get contacts with include tags
    if (formData.include_tags.length > 0) {
      const { data: taggedUsers } = await supabase
        .from('user_tags')
        .select('email')
        .in('tag_id', formData.include_tags);

      if (taggedUsers) {
        for (const tagged of taggedUsers) {
          if (tagged.email && !emails.includes(tagged.email)) {
            // Check if unsubscribed
            const { data: contact } = await supabase
              .from('email_contacts')
              .select('is_subscribed')
              .eq('email', tagged.email)
              .maybeSingle();

            if (!contact || contact.is_subscribed) {
              emails.push(tagged.email);
            }
          }
        }
      }
    }

    // Remove excluded tag emails
    let finalEmails = emails;
    if (formData.exclude_tags.length > 0) {
      const { data: excludedUsers } = await supabase
        .from('user_tags')
        .select('email')
        .in('tag_id', formData.exclude_tags);

      const excludeSet = new Set((excludedUsers || []).map(e => e.email?.toLowerCase()).filter(Boolean));
      finalEmails = emails.filter(e => !excludeSet.has(e.toLowerCase()));
    }

    setRecipientCount(finalEmails.length);
    setPreviewEmails(finalEmails.slice(0, 10));
  }

  async function fetchData() {
    const [campaignsRes, listsRes, tagsRes] = await Promise.all([
      supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('email_lists').select('id, name').order('name'),
      supabase.from('email_tags').select('id, name').order('name')
    ]);

    if (campaignsRes.error) toast.error('Failed to load campaigns');

    setCampaigns((campaignsRes.data || []) as EmailCampaign[]);
    setLists(listsRes.data || []);
    setTags(tagsRes.data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body_html.trim()) {
      toast.error('Name, subject, and content are required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      body_html: formData.body_html,
      body_text: formData.body_text.trim() || null,
      send_to_lists: formData.send_to_lists,
      include_tags: formData.include_tags,
      exclude_tags: formData.exclude_tags,
      scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      status: formData.scheduled_at ? 'scheduled' : 'draft'
    };

    if (editingCampaign) {
      const { error } = await supabase
        .from('email_campaigns')
        .update(payload)
        .eq('id', editingCampaign.id);

      if (error) {
        toast.error('Failed to update campaign');
      } else {
        toast.success('Campaign updated');
        fetchData();
      }
    } else {
      const { error } = await supabase.from('email_campaigns').insert(payload);

      if (error) {
        toast.error('Failed to create campaign');
      } else {
        toast.success('Campaign created');
        fetchData();
      }
    }

    setDialogOpen(false);
    resetForm();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return;

    const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete campaign');
    } else {
      toast.success('Campaign deleted');
      fetchData();
    }
  }

  async function handleSend(campaign: EmailCampaign) {
    if (!confirm('Send this campaign now? This cannot be undone.')) return;

    // Call edge function to send campaign
    const { data, error } = await supabase.functions.invoke('send-email-campaign', {
      body: { campaignId: campaign.id }
    });

    if (error) {
      toast.error('Failed to send campaign');
    } else {
      toast.success(`Campaign sent to ${data?.sentCount || 0} recipients`);
      fetchData();
    }
  }

  async function handleDuplicate(campaign: EmailCampaign) {
    const payload = {
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      body_html: campaign.body_html,
      body_text: campaign.body_text,
      send_to_lists: campaign.send_to_lists || [],
      include_tags: campaign.include_tags || [],
      exclude_tags: campaign.exclude_tags || [],
      scheduled_at: null,
      status: 'draft'
    };

    const { error } = await supabase.from('email_campaigns').insert(payload);

    if (error) {
      toast.error('Failed to duplicate campaign');
    } else {
      toast.success('Campaign duplicated');
      fetchData();
    }
  }

  function resetForm() {
    setEditingCampaign(null);
    setFormData({
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      send_to_lists: [],
      include_tags: [],
      exclude_tags: [],
      scheduled_at: ''
    });
    setRecipientCount(null);
    setPreviewEmails([]);
  }

  function openEdit(campaign: EmailCampaign) {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      body_html: campaign.body_html,
      body_text: campaign.body_text || '',
      send_to_lists: campaign.send_to_lists || [],
      include_tags: campaign.include_tags || [],
      exclude_tags: campaign.exclude_tags || [],
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : ''
    });
    setDialogOpen(true);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  function toggleList(listId: string) {
    setFormData(prev => ({
      ...prev,
      send_to_lists: prev.send_to_lists.includes(listId)
        ? prev.send_to_lists.filter(id => id !== listId)
        : [...prev.send_to_lists, listId]
    }));
  }

  function toggleIncludeTag(tagId: string) {
    setFormData(prev => ({
      ...prev,
      include_tags: prev.include_tags.includes(tagId)
        ? prev.include_tags.filter(id => id !== tagId)
        : [...prev.include_tags, tagId]
    }));
  }

  function toggleExcludeTag(tagId: string) {
    setFormData(prev => ({
      ...prev,
      exclude_tags: prev.exclude_tags.includes(tagId)
        ? prev.exclude_tags.filter(id => id !== tagId)
        : [...prev.exclude_tags, tagId]
    }));
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>;
      case 'sending': return <Badge className="bg-amber-500">Sending</Badge>;
      case 'sent': return <Badge className="bg-green-500">Sent</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Campaigns
            </CardTitle>
            <CardDescription>
              Create and send email campaigns to lists or tagged contacts. Unsubscribe links are added automatically.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
                <DialogDescription>
                  Compose and target your email campaign
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="audience">
                    Audience
                    {recipientCount !== null && (
                      <Badge variant="secondary" className="ml-2">
                        {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : recipientCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Campaign Name (internal)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., December Newsletter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Your December Update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Content (HTML)</Label>
                    <Textarea
                      value={formData.body_html}
                      onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                      placeholder="<html>...</html>"
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{{first_name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'} for personalization. An unsubscribe link is added automatically if not included.
                    </p>
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
                </TabsContent>

                <TabsContent value="audience" className="space-y-4 py-4">
                  {/* Recipient count display */}
                  {(formData.send_to_lists.length > 0 || formData.include_tags.length > 0) && (
                    <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {loadingPreview ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Calculating...
                            </span>
                          ) : (
                            `${recipientCount ?? 0} recipients will receive this email`
                          )}
                        </p>
                        {previewEmails.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Including: {previewEmails.slice(0, 3).join(', ')}
                            {previewEmails.length > 3 && ` and ${recipientCount! - 3} more...`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Send to Lists</Label>
                    <div className="flex flex-wrap gap-2">
                      {lists.map(list => (
                        <Badge
                          key={list.id}
                          variant={formData.send_to_lists.includes(list.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleList(list.id)}
                        >
                          {list.name}
                        </Badge>
                      ))}
                      {lists.length === 0 && (
                        <p className="text-sm text-muted-foreground">No lists created</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Include contacts with these tags (AND)</Label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant={formData.include_tags.includes(tag.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleIncludeTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Exclude contacts with these tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant={formData.exclude_tags.includes(tag.id) ? 'destructive' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleExcludeTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recipients = (All in selected lists OR have include tags) AND NOT have exclude tags AND are subscribed
                  </p>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Schedule Send (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to save as draft
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingCampaign ? 'Update' : 'Save'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-muted-foreground">No campaigns created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(campaign => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {campaign.subject}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    {campaign.status === 'sent' 
                      ? `${campaign.sent_count}/${campaign.total_recipients}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {campaign.status === 'draft' && (
                        <Button variant="ghost" size="icon" onClick={() => handleSend(campaign)} title="Send">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDuplicate(campaign)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEdit(campaign)}
                        disabled={campaign.status === 'sending'}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(campaign.id)}
                        disabled={campaign.status === 'sending'}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
