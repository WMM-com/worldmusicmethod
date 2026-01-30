import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const testEmailSchema = z.object({
  sender_domain: z.enum(['worldmusicmethod.com', 'arts-admin.com']),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
});

type TestEmailFormData = z.infer<typeof testEmailSchema>;

interface TestEmailDialogProps {
  userEmail: string;
  userName: string;
}

export function TestEmailDialog({ userEmail, userName }: TestEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const form = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      sender_domain: 'worldmusicmethod.com',
      subject: 'Test Email from Admin',
      body: `<p>Hello ${userName || 'there'},</p>
<p>This is a test email sent from the Admin Dashboard.</p>
<p>If you received this, the email system is working correctly.</p>
<p>Best regards,<br/>The Team</p>`,
    },
  });

  const onSubmit = async (data: TestEmailFormData) => {
    setSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email-ses', {
        body: {
          to: userEmail,
          subject: data.subject,
          html: data.body,
          sender_domain: data.sender_domain,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success(`Test email sent to ${userEmail}`);
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Mail className="h-4 w-4 mr-1" />
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a test email to <strong>{userEmail}</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="sender_domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender Domain</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sender domain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="worldmusicmethod.com">
                        World Music Method (info@worldmusicmethod.com)
                      </SelectItem>
                      <SelectItem value="arts-admin.com">
                        Left Brain (info@arts-admin.com)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body (HTML)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="<p>Your email content here...</p>"
                      className="min-h-[150px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
