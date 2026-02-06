import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createNotification } from '@/hooks/useNotifications';

interface ProjectReportFormProps {
  projectId: string;
  userId: string;
}

export function ProjectReportForm({ projectId, userId }: ProjectReportFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) {
      toast.error('Please sign in and enter a description of the issue.');
      return;
    }

    setSubmitting(true);
    try {
      // Insert report
      const { error } = await supabase.from('project_reports').insert({
        project_id: projectId,
        reporter_id: user.id,
        reporter_email: user.email,
        message: message.trim(),
      });

      if (error) throw error;

      // Get admin user IDs and notify them
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.user_id,
            type: 'project_report',
            title: 'Project Issue Reported',
            message: `A user reported an issue with a project listing: "${message.trim().slice(0, 100)}"`,
            referenceId: projectId,
            referenceType: 'project',
            fromUserId: user.id,
          });
        }
      }

      setSubmitted(true);
      setMessage('');
      toast.success('Report submitted. Thank you!');
    } catch (err: any) {
      console.error('Report error:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
        <Check className="h-4 w-4 text-primary shrink-0" />
        Thank you for reporting this issue. Our team will review it.
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Report an issue
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue with this project listing..."
            rows={3}
            maxLength={500}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length}/500</span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!message.trim() || submitting || !user}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-destructive">You must be signed in to report an issue.</p>
          )}
        </div>
      )}
    </div>
  );
}
