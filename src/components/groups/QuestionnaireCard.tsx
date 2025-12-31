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
  onEdit: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

export function QuestionnaireCard({ questionnaire: q, isAdmin, groupId, onEdit, onPin, onDelete }: QuestionnaireCardProps) {
  return (
    <Card className={q.is_pinned ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">{q.title}</CardTitle>
            {q.is_pinned && <Badge variant="secondary" className="text-xs"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
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
                <DropdownMenuItem onClick={() => onPin(q.id, !q.is_pinned)}>
                  {q.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                  {q.is_pinned ? 'Unpin' : 'Pin to top'}
                </DropdownMenuItem>
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
          >
            {q.user_has_responded ? 'View Response' : 'Take Survey'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
