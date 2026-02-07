import { useState } from 'react';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, parseISO, startOfDay } from 'date-fns';
import { FileText, Send, Mail, CheckCircle, Plus, Download, DollarSign, Trash2, RotateCcw, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sendInvoiceSchema } from '@/lib/validations';
import { InvoiceCreateDialog } from '@/components/invoices/InvoiceCreateDialog';
import { InvoiceEditDialog } from '@/components/invoices/InvoiceEditDialog';
import { downloadInvoicePdf } from '@/lib/generateInvoicePdf';
import { Invoice } from '@/types/database';

export default function Invoices() {
  const { invoices, deletedInvoices, isLoading, isLoadingDeleted, refetch, updateInvoice, softDeleteInvoice, restoreInvoice, deleteInvoice } = useInvoices();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const handleMarkAsPaid = (invoice: Invoice) => {
    updateInvoice.mutate({
      id: invoice.id,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
  };

  const handleMarkAsUnpaid = (invoice: Invoice) => {
    updateInvoice.mutate({
      id: invoice.id,
      status: 'unpaid',
      paid_at: null,
    });
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid') return false;
    if (!invoice.due_date) return false;
    return isPast(startOfDay(parseISO(invoice.due_date)));
  };

  const getDisplayStatus = (invoice: Invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (isOverdue(invoice)) return 'overdue';
    return invoice.status;
  };

  const getStatusStyles = (invoice: Invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    switch (displayStatus) {
      case 'paid':
        return 'bg-success/20 text-success';
      case 'overdue':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-warning/20 text-warning';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    await downloadInvoicePdf(invoice, profile);
    toast({
      title: "PDF Downloaded",
      description: `Invoice ${invoice.invoice_number} has been downloaded`,
    });
  };

  const handleOpenSendDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setRecipientEmail(invoice.client_email || '');
    setEmailError(null);
    setSendDialogOpen(true);
  };

  const handleOpenEditDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  const handleSendInvoice = async () => {
    const result = sendInvoiceSchema.safeParse({ recipientEmail });
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || 'Invalid email');
      return;
    }
    setEmailError(null);

    if (!selectedInvoice) {
      toast({ title: "Error", description: "No invoice selected", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: { invoiceId: selectedInvoice.id, recipientEmail },
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent",
        description: `Invoice ${selectedInvoice.invoice_number} has been sent to ${recipientEmail}`,
      });

      setSendDialogOpen(false);
      setSelectedInvoice(null);
      setEmailError(null);
      refetch();
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Failed to send invoice",
        description: error.message || "An error occurred while sending the invoice",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderInvoiceCard = (invoice: Invoice, isDeleted = false) => (
    <Card key={invoice.id} className="glass">
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Top row: info + amount */}
          <div className="flex items-start justify-between gap-3 sm:flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm sm:text-base">{invoice.invoice_number}</p>
              <p className="text-sm text-muted-foreground truncate">{invoice.client_name}</p>
              {invoice.sent_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 text-success" />
                  Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}
                </p>
              )}
              {invoice.paid_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Paid {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                </p>
              )}
              {!invoice.paid_at && invoice.due_date && !isDeleted && (
                <p className={`text-xs mt-1 ${isOverdue(invoice) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  Due {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm sm:text-base">{formatCurrency(invoice.amount, invoice.currency)}</p>
              {!isDeleted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${getStatusStyles(invoice)}`}>
                      {getDisplayStatus(invoice)}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {invoice.status !== 'paid' && (
                      <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </DropdownMenuItem>
                    )}
                    {invoice.status === 'paid' && (
                      <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Mark as Unpaid
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Action buttons - full width row on mobile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDeleted ? (
              <>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => restoreInvoice.mutate(invoice.id)}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteInvoice.mutate(invoice.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(invoice)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleOpenSendDialog(invoice)}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => softDeleteInvoice.mutate(invoice.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Create and manage your invoices</p>
          </div>
          <Button className="gradient-primary w-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="bin" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Bin
              {deletedInvoices.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">{deletedInvoices.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : invoices.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first invoice or generate one from an event</p>
                  <Button className="gradient-primary" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">{invoices.map(inv => renderInvoiceCard(inv as Invoice))}</div>
            )}
          </TabsContent>

          <TabsContent value="bin" className="mt-6">
            {isLoadingDeleted ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : deletedInvoices.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Bin is empty</h3>
                  <p className="text-muted-foreground">Deleted invoices will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">{deletedInvoices.map(inv => renderInvoiceCard(inv as Invoice, true))}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <InvoiceCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <InvoiceEditDialog invoice={selectedInvoice} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Invoice
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && <>Send invoice <strong>{selectedInvoice.invoice_number}</strong> to your client via email.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => { setRecipientEmail(e.target.value); if (emailError) setEmailError(null); }}
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
            {selectedInvoice && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span>{selectedInvoice.client_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvoice} disabled={isSending || !recipientEmail}>
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}