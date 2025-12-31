import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Users } from 'lucide-react';
import { useQuestionnaireResponses } from '@/hooks/useQuestionnaires';
import { format } from 'date-fns';
import type { Questionnaire, Question } from '@/hooks/useQuestionnaires';

interface ViewResponsesDialogProps {
  questionnaire: Questionnaire;
  trigger?: ReactNode;
}

export function ViewResponsesDialog({ questionnaire, trigger }: ViewResponsesDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: responses, isLoading } = useQuestionnaireResponses(questionnaire.id);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatAnswer = (question: Question, answer: string | string[] | number | undefined) => {
    if (answer === undefined || answer === null) return '—';
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'number') return `${answer}`;
    return answer;
  };

  const exportToCsv = () => {
    if (!responses?.length) return;

    // Build CSV headers
    const headers = ['Respondent', 'Submitted At', ...questionnaire.questions.map(q => q.question)];
    
    // Build CSV rows
    const rows = responses.map(response => {
      const row = [
        response.profile?.full_name || 'Anonymous',
        format(new Date(response.created_at), 'yyyy-MM-dd HH:mm'),
        ...questionnaire.questions.map(q => {
          const answer = response.answers[q.id];
          if (answer === undefined || answer === null) return '';
          if (Array.isArray(answer)) return answer.join('; ');
          return String(answer);
        })
      ];
      return row;
    });

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${questionnaire.title.replace(/[^a-z0-9]/gi, '_')}_responses.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            View Responses ({questionnaire.response_count || 0})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{questionnaire.title} - Responses</DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCsv}
              disabled={!responses?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {responses?.length || 0} total responses
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : responses?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No responses yet
            </div>
          ) : (
            <div className="space-y-4">
              {responses?.map((response) => (
                <Card key={response.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={response.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(response.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {response.profile?.full_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {questionnaire.questions.map((question, i) => (
                        <div key={question.id} className="text-sm">
                          <p className="text-muted-foreground mb-1">
                            {i + 1}. {question.question}
                          </p>
                          <p className="font-medium">
                            {formatAnswer(question, response.answers[question.id])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
