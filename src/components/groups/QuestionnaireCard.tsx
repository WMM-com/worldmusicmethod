import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pin, PinOff, MoreHorizontal, Trash2, Pencil, ClipboardList } from 'lucide-react';
import type { Questionnaire } from '@/hooks/useQuestionnaires';

interface QuestionnaireCardProps {
  questionnaire: Questionnaire;
  isAdmin: boolean;
  groupId: string;
  canPin?: boolean;
  onEdit: () => void;
  onTakeSurvey: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

export function QuestionnaireCard({ questionnaire: q, isAdmin, groupId, canPin = true, onEdit, onTakeSurvey, onPin, onDelete }: QuestionnaireCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">{q.title}</CardTitle>
            {q.is_pinned && <Badge className="text-xs bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
            <Badge variant={q.is_active ? 'default' : 'secondary'}>{q.is_active ? 'Active' : 'Closed'}</Badge>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
                {(canPin || q.is_pinned) && (
                  <DropdownMenuItem onClick={() => onPin(q.id, !q.is_pinned)} disabled={!canPin && !q.is_pinned}>
                    {q.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                    {q.is_pinned ? 'Unpin' : 'Pin to top'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(q.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {q.description && <p className="text-sm text-muted-foreground">{q.description}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {q.response_count || 0} responses • {q.questions.length} questions
          </p>
          <Button 
            variant={q.user_has_responded ? 'outline' : 'default'}
            size="sm"
            disabled={!q.is_active || (q.user_has_responded && !q.allow_multiple_responses)}
            onClick={onTakeSurvey}
          >
            {q.user_has_responded ? 'View Response' : 'Take Survey'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
