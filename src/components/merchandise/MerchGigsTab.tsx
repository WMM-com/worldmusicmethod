import { useState } from 'react';
import { Plus, CalendarDays, QrCode, Pencil, Trash2, Copy, Check, Smartphone, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMerchGigs, useCreateMerchGig, useUpdateMerchGig, useDeleteMerchGig, type MerchGig } from '@/hooks/useMerchandise';
import { usePaymentAccounts } from '@/hooks/usePaymentAccounts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'active': return 'default';
    case 'upcoming': return 'secondary';
    case 'completed': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const appUrl = window.location.origin;

export function MerchGigsTab() {
  const { data: gigs = [], isLoading } = useMerchGigs();
  const { data: paymentAccounts = [] } = usePaymentAccounts();
  const createGig = useCreateMerchGig();
  const updateGig = useUpdateMerchGig();
  const deleteGig = useDeleteMerchGig();

  const stripeAccount = paymentAccounts.find(a => a.provider === 'stripe');
  const isStripeConnected = stripeAccount?.onboarding_complete;

  const [formOpen, setFormOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<MerchGig | null>(null);
  const [qrGig, setQrGig] = useState<MerchGig | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    venue: '',
    location: '',
    gig_date: new Date().toISOString().slice(0, 10),
    currency: 'USD',
    notes: '',
    status: 'upcoming',
  });

  const openCreate = () => {
    setEditingGig(null);
    setForm({ name: '', venue: '', location: '', gig_date: new Date().toISOString().slice(0, 10), currency: 'USD', notes: '', status: 'upcoming' });
    setFormOpen(true);
  };

  const openEdit = (g: MerchGig) => {
    setEditingGig(g);
    setForm({
      name: g.name,
      venue: g.venue || '',
      location: g.location || '',
      gig_date: g.gig_date,
      currency: g.currency,
      notes: g.notes || '',
      status: g.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      venue: form.venue || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };

    if (editingGig) {
      await updateGig.mutateAsync({ id: editingGig.id, ...payload });
    } else {
      const newGig = await createGig.mutateAsync(payload);
      // Auto-create Terminal location if Stripe is connected
      if (isStripeConnected && newGig?.id) {
        createTerminalLocation(newGig.id, form.name, form.location);
      }
    }
    setFormOpen(false);
  };

  const createTerminalLocation = async (gigId: string, displayName: string, location?: string) => {
    setCreatingLocation(gigId);
    try {
      // Parse location into city/country if possible
      const parts = location?.split(',').map(s => s.trim()) || [];
      const city = parts[0] || 'City';
      const country = parts[1] || 'GB';

      const { data, error } = await supabase.functions.invoke('create-terminal-location', {
        body: {
          gig_id: gigId,
          display_name: displayName,
          city,
          country: country.length === 2 ? country : 'GB',
        },
      });

      if (error) throw error;
      toast.success('Terminal location created — you can now use Tap to Pay');
    } catch (err: any) {
      console.error('Terminal location error:', err);
      toast.error('Could not create Terminal location: ' + (err.message || 'Unknown error'));
    } finally {
      setCreatingLocation(null);
    }
  };

  const payUrl = qrGig ? `${appUrl}/pay/${qrGig.id}` : '';
  const qrSrc = qrGig ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payUrl)}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{gigs.length} gig{gigs.length !== 1 ? 's' : ''}</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gig
        </Button>
      </div>

      {gigs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No gigs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a gig to start tracking merch sales at events.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Gig
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gigs.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{format(new Date(g.gig_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-muted-foreground">{g.venue || '—'}</TableCell>
                  <TableCell>{g.currency}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(g.status)} className="capitalize">{g.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {g.stripe_location_id ? (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        Linked
                      </Badge>
                    ) : isStripeConnected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => createTerminalLocation(g.id, g.name, g.location || undefined)}
                        disabled={creatingLocation === g.id}
                      >
                        {creatingLocation === g.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Smartphone className="h-3 w-3 mr-1" />
                        )}
                        Set up
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setQrGig(g)} title="View QR Code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(g)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteGig.mutate(g.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGig ? 'Edit Gig' : 'Create Gig'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Festival" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.gig_date} onChange={e => setForm(f => ({ ...f, gig_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Venue</Label>
                <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="The Blue Note" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="London, GB" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'NGN', 'KES', 'ZAR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingGig && isStripeConnected && (
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  A Stripe Terminal location will be created automatically so you can accept Tap to Pay with the Stripe Dashboard app.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createGig.isPending || updateGig.isPending}>
              {editingGig ? 'Save Changes' : 'Create Gig'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrGig} onOpenChange={() => setQrGig(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Payment QR Code</DialogTitle>
          </DialogHeader>
          {qrGig && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{qrGig.name}</p>
              <div className="flex justify-center">
                <img src={qrSrc} alt="QR Code" className="rounded-lg border border-border" width={250} height={250} />
              </div>
              <div className="flex items-center gap-2">
                <Input value={payUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Terminal instructions */}
              {qrGig.stripe_location_id && (
                <Alert className="text-left">
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Tap to Pay:</strong> Open the Stripe Dashboard app on your phone. Go to <strong>Payments → Collect payment</strong> and select the location "<strong>{qrGig.name}</strong>". All Terminal sales will sync here automatically.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
