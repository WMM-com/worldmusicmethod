import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useMyLessons, useCreateLesson, useUpdateLesson } from '@/hooks/useLessons';
import { BookOpen, Plus, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
];

export function TutorLessonManager() {
  const { data: lessons, isLoading } = useMyLessons();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    duration_minutes: '60',
  });

  const resetForm = () => {
    setForm({ title: '', description: '', price: '', currency: 'USD', duration_minutes: '60' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (lesson: any) => {
    setForm({
      title: lesson.title,
      description: lesson.description || '',
      price: lesson.price ? String(lesson.price) : '',
      currency: lesson.currency || 'USD',
      duration_minutes: String(lesson.duration_minutes || 60),
    });
    setEditingId(lesson.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        duration_minutes: parseInt(form.duration_minutes) || 60,
      };

      if (editingId) {
        await updateLesson.mutateAsync({ id: editingId, ...data });
        toast.success('Lesson updated');
      } else {
        await createLesson.mutateAsync(data);
        toast.success('Lesson created');
      }
      resetForm();
    } catch {
      toast.error('Failed to save lesson');
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateLesson.mutateAsync({ id, active: !active } as any);
      toast.success(active ? 'Lesson deactivated' : 'Lesson activated');
    } catch {
      toast.error('Failed to update lesson');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> My Lessons
        </h2>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Lesson
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Guitar Masterclass"
                  className="text-base py-3.5 rounded-xl"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What will students learn?"
                  className="text-base py-3.5 rounded-xl"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className="text-base py-3.5 rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="text-base py-3.5 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    className="text-base py-3.5 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createLesson.isPending || updateLesson.isPending}>
                  {(createLesson.isPending || updateLesson.isPending) ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
                  ) : editingId ? 'Update Lesson' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lessons List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : lessons?.length ? (
        <div className="space-y-2">
          {lessons.map(lesson => {
            const symbol = lesson.currency === 'GBP' ? '£' : lesson.currency === 'EUR' ? '€' : '$';
            return (
              <Card key={lesson.id} className={!lesson.active ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{lesson.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{symbol}{lesson.price || 0}</span>
                      <span>·</span>
                      <span>{lesson.duration_minutes} min</span>
                      {!lesson.active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={lesson.active}
                      onCheckedChange={() => toggleActive(lesson.id, lesson.active)}
                      aria-label="Toggle active"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(lesson)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
          No lessons yet. Create your first lesson to start accepting bookings.
        </p>
      )}
    </div>
  );
}
