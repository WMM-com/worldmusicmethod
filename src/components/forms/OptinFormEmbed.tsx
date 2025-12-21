import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

interface OptinFormEmbedProps {
  formId: string;
  className?: string;
}

interface FormConfig {
  id: string;
  heading: string | null;
  description: string | null;
  button_text: string;
  success_message: string;
  redirect_url: string | null;
  is_active: boolean;
}

export function OptinFormEmbed({ formId, className }: OptinFormEmbedProps) {
  const [form, setForm] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    async function fetchForm() {
      const { data, error } = await supabase
        .from('optin_forms')
        .select('id, heading, description, button_text, success_message, redirect_url, is_active')
        .eq('id', formId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Failed to load form:', error);
      } else {
        setForm(data as FormConfig);
      }
      setLoading(false);
    }

    if (formId) {
      fetchForm();
    }
  }, [formId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('submit-optin-form', {
        body: {
          formId,
          email: email.trim(),
          firstName: firstName.trim() || null,
        }
      });

      if (error) throw error;

      setSubmitted(true);
      
      if (form?.redirect_url) {
        window.location.href = form.redirect_url;
      }
    } catch (err) {
      console.error('Form submission error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return null; // Form not found or inactive
  }

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-lg font-medium">{form.success_message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(form.heading || form.description) && (
        <CardHeader>
          {form.heading && <CardTitle>{form.heading}</CardTitle>}
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={form.heading || form.description ? '' : 'pt-6'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-firstName`}>First Name</Label>
            <Input
              id={`${formId}-firstName`}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-email`}>Email *</Label>
            <Input
              id={`${formId}-email`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              form.button_text
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
