import { useState } from 'react';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FileText, Send, Mail, CheckCircle } from 'lucide-react';
import { sendInvoiceSchema } from '@/lib/validations';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  amount: number;
  status: string;
  sent_at: string | null;
}

export default function Invoices() {
  const { invoices, isLoading, refetch } = useInvoices();
  const { toast } = useToast();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const handleOpenSendDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setRecipientEmail(invoice.client_email || '');
    setEmailError(null);
    setSendDialogOpen(true);
  };

  const handleSendInvoice = async () => {
    // Validate email with Zod
    const result = sendInvoiceSchema.safeParse({ recipientEmail });
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || 'Invalid email');
      return;
    }
    setEmailError(null);

    if (!selectedInvoice) {
      toast({
        title: "Error",
        description: "No invoice selected",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          invoiceId: selectedInvoice.id,
          recipientEmail: recipientEmail,
        },
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create and manage your invoices</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : invoices.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
              <p className="text-muted-foreground">Invoices will appear here when you create them from events</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="glass">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground truncate">{invoice.client_name}</p>
                      {invoice.sent_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          invoice.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>{invoice.status}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSendDialog(invoice as Invoice)}
                        className="flex items-center gap-1"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Invoice
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <>Send invoice <strong>{selectedInvoice.invoice_number}</strong> to your client via email.</>
              )}
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
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
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
                  <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvoice} disabled={isSending || !recipientEmail}>
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
