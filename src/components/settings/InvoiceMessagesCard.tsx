import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceMessageTemplate } from '@/types/database';

type InvoiceMessage = InvoiceMessageTemplate;

interface InvoiceMessagesCardProps {
  latePaymentMessages: InvoiceMessage[];
  thankYouMessages: InvoiceMessage[];
  autoAddLatePayment: boolean;
  autoAddThankYou: boolean;
  defaultLatePaymentId: string | null;
  defaultThankYouId: string | null;
  onUpdate: (updates: {
    invoice_late_payment_messages?: InvoiceMessage[];
    invoice_thank_you_messages?: InvoiceMessage[];
    auto_add_late_payment_message?: boolean;
    auto_add_thank_you_message?: boolean;
    default_late_payment_message_id?: string | null;
    default_thank_you_message_id?: string | null;
  }) => void;
  saving?: boolean;
}

const DEFAULT_LATE_PAYMENT = "Interest will be charged at 2% per month on overdue invoices. Payment is due within the terms stated above.";
const DEFAULT_THANK_YOU = "Thank you for your business. We appreciate working with you!";

export function InvoiceMessagesCard({
  latePaymentMessages,
  thankYouMessages,
  autoAddLatePayment,
  autoAddThankYou,
  defaultLatePaymentId,
  defaultThankYouId,
  onUpdate,
  saving,
}: InvoiceMessagesCardProps) {
  const [newLatePayment, setNewLatePayment] = useState({ name: '', text: '' });
  const [newThankYou, setNewThankYou] = useState({ name: '', text: '' });
  const [showAddLatePayment, setShowAddLatePayment] = useState(false);
  const [showAddThankYou, setShowAddThankYou] = useState(false);

  const addLatePaymentMessage = () => {
    if (!newLatePayment.name.trim() || !newLatePayment.text.trim()) {
      toast.error('Please fill in both name and message');
      return;
    }
    const newMessage: InvoiceMessage = {
      id: crypto.randomUUID(),
      name: newLatePayment.name.trim(),
      text: newLatePayment.text.trim(),
    };
    onUpdate({ invoice_late_payment_messages: [...latePaymentMessages, newMessage] });
    setNewLatePayment({ name: '', text: '' });
    setShowAddLatePayment(false);
  };

  const addThankYouMessage = () => {
    if (!newThankYou.name.trim() || !newThankYou.text.trim()) {
      toast.error('Please fill in both name and message');
      return;
    }
    const newMessage: InvoiceMessage = {
      id: crypto.randomUUID(),
      name: newThankYou.name.trim(),
      text: newThankYou.text.trim(),
    };
    onUpdate({ invoice_thank_you_messages: [...thankYouMessages, newMessage] });
    setNewThankYou({ name: '', text: '' });
    setShowAddThankYou(false);
  };

  const removeLatePaymentMessage = (id: string) => {
    onUpdate({ 
      invoice_late_payment_messages: latePaymentMessages.filter(m => m.id !== id),
      default_late_payment_message_id: defaultLatePaymentId === id ? null : defaultLatePaymentId,
    });
  };

  const removeThankYouMessage = (id: string) => {
    onUpdate({ 
      invoice_thank_you_messages: thankYouMessages.filter(m => m.id !== id),
      default_thank_you_message_id: defaultThankYouId === id ? null : defaultThankYouId,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Messages</CardTitle>
        <CardDescription>
          Create templates for late payment terms and thank you messages that can be added to invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Late Payment Terms Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Late Payment Terms</h3>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Default message:</strong> {DEFAULT_LATE_PAYMENT}
          </div>

          {latePaymentMessages.length > 0 && (
            <div className="space-y-2">
              {latePaymentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 p-3 border rounded-lg bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{msg.name}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => removeLatePaymentMessage(msg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddLatePayment ? (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Input
                placeholder="Template name (e.g. 'Standard Terms')"
                value={newLatePayment.name}
                onChange={(e) => setNewLatePayment({ ...newLatePayment, name: e.target.value })}
              />
              <Textarea
                placeholder="Late payment message text..."
                value={newLatePayment.text}
                onChange={(e) => setNewLatePayment({ ...newLatePayment, text: e.target.value })}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addLatePaymentMessage}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddLatePayment(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAddLatePayment(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Late Payment Template
            </Button>
          )}

          {latePaymentMessages.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-late">Auto-add to all invoices</Label>
                <Switch
                  id="auto-late"
                  checked={autoAddLatePayment}
                  onCheckedChange={(checked) => onUpdate({ auto_add_late_payment_message: checked })}
                />
              </div>
              {autoAddLatePayment && (
                <div className="space-y-2">
                  <Label>Default template</Label>
                  <Select
                    value={defaultLatePaymentId || 'default'}
                    onValueChange={(v) => onUpdate({ default_late_payment_message_id: v === 'default' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use built-in default</SelectItem>
                      {latePaymentMessages.map((msg) => (
                        <SelectItem key={msg.id} value={msg.id}>{msg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t" />

        {/* Thank You Messages Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Thank You Messages</h3>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Default message:</strong> {DEFAULT_THANK_YOU}
          </div>

          {thankYouMessages.length > 0 && (
            <div className="space-y-2">
              {thankYouMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 p-3 border rounded-lg bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{msg.name}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => removeThankYouMessage(msg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddThankYou ? (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Input
                placeholder="Template name (e.g. 'Jazz Band')"
                value={newThankYou.name}
                onChange={(e) => setNewThankYou({ ...newThankYou, name: e.target.value })}
              />
              <Textarea
                placeholder="Thank you message text..."
                value={newThankYou.text}
                onChange={(e) => setNewThankYou({ ...newThankYou, text: e.target.value })}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addThankYouMessage}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddThankYou(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAddThankYou(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Thank You Template
            </Button>
          )}

          {thankYouMessages.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-thanks">Auto-add to all invoices</Label>
                <Switch
                  id="auto-thanks"
                  checked={autoAddThankYou}
                  onCheckedChange={(checked) => onUpdate({ auto_add_thank_you_message: checked })}
                />
              </div>
              {autoAddThankYou && (
                <div className="space-y-2">
                  <Label>Default template</Label>
                  <Select
                    value={defaultThankYouId || 'default'}
                    onValueChange={(v) => onUpdate({ default_thank_you_message_id: v === 'default' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use built-in default</SelectItem>
                      {thankYouMessages.map((msg) => (
                        <SelectItem key={msg.id} value={msg.id}>{msg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_LATE_PAYMENT, DEFAULT_THANK_YOU };
export type { InvoiceMessage };
