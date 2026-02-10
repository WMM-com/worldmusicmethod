import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Lock } from 'lucide-react';
import { useLessonNotes, useCreateLessonNote } from '@/hooks/useLessonNotes';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LessonNotesPanelProps {
  bookingRequestId: string;
  isTutor?: boolean;
}

export function LessonNotesPanel({ bookingRequestId, isTutor = false }: LessonNotesPanelProps) {
  const { data: notes, isLoading } = useLessonNotes(bookingRequestId);
  const createNote = useCreateLessonNote();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error('Note cannot be empty'); return; }
    try {
      await createNote.mutateAsync({ bookingRequestId, content: content.trim(), isPrivate });
      setContent('');
      setShowForm(false);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> Lesson Notes
        </CardTitle>
        {isTutor && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 p-3 border rounded-lg">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write lesson notes, feedback, homework assignments..."
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} id="private-note" />
                <Label htmlFor="private-note" className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private (only you can see)
                </Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={createNote.isPending}>
                  {createNote.isPending ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading notes...</p>
        ) : notes?.length ? (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="p-2.5 bg-muted rounded-md space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                  {note.is_private && (
                    <Badge variant="outline" className="text-xs gap-1 h-5">
                      <Lock className="h-2.5 w-2.5" /> Private
                    </Badge>
                  )}
                  {note.author_id === user?.id && (
                    <Badge variant="secondary" className="text-xs h-5">You</Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">No notes yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
