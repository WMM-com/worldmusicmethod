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
import { BookOpen, Plus, Pencil, Loader2, Users, Clock, Shield, Repeat } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
];

const LESSON_TYPES = [
  { value: 'single', label: 'Single Session' },
  { value: 'recurring', label: 'Recurring Series' },
  { value: 'group', label: 'Group Lesson' },
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
    lesson_type: 'single',
    max_students: '1',
    buffer_minutes: '0',
    cancellation_policy_hours: '24',
    allow_rescheduling: true,
    // Recurring config
    recurring_frequency: 'weekly',
    recurring_sessions: '4',
    recurring_series_price: '',
  });

  const resetForm = () => {
    setForm({
      title: '', description: '', price: '', currency: 'USD', duration_minutes: '60',
      lesson_type: 'single', max_students: '1', buffer_minutes: '0',
      cancellation_policy_hours: '24', allow_rescheduling: true,
      recurring_frequency: 'weekly', recurring_sessions: '4', recurring_series_price: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (lesson: any) => {
    const rc = lesson.recurring_config || {};
    setForm({
      title: lesson.title,
      description: lesson.description || '',
      price: lesson.price ? String(lesson.price) : '',
      currency: lesson.currency || 'USD',
      duration_minutes: String(lesson.duration_minutes || 60),
      lesson_type: lesson.lesson_type || 'single',
      max_students: String(lesson.max_students || 1),
      buffer_minutes: String(lesson.buffer_minutes || 0),
      cancellation_policy_hours: String(lesson.cancellation_policy_hours || 24),
      allow_rescheduling: lesson.allow_rescheduling ?? true,
      recurring_frequency: rc.frequency || 'weekly',
      recurring_sessions: String(rc.total_sessions || 4),
      recurring_series_price: rc.series_price ? String(rc.series_price) : '',
    });
    setEditingId(lesson.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    try {
      const recurringConfig = form.lesson_type === 'recurring' ? {
        frequency: form.recurring_frequency,
        total_sessions: parseInt(form.recurring_sessions) || 4,
        series_price: form.recurring_series_price ? parseFloat(form.recurring_series_price) : null,
      } : null;

      const data: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        lesson_type: form.lesson_type,
        max_students: form.lesson_type === 'group' ? (parseInt(form.max_students) || 5) : 1,
        buffer_minutes: parseInt(form.buffer_minutes) || 0,
        cancellation_policy_hours: parseInt(form.cancellation_policy_hours) || 24,
        allow_rescheduling: form.allow_rescheduling,
        recurring_config: recurringConfig,
      };

      if (editingId) {
        await updateLesson.mutateAsync({ id: editingId, ...data } as any);
        toast.success('Lesson updated');
      } else {
        await createLesson.mutateAsync(data as any);
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
              {/* Title */}
              <div className="flex flex-col gap-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guitar Masterclass" required />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will students learn?" rows={3} />
              </div>

              {/* Lesson Type */}
              <div className="flex flex-col gap-2">
                <Label>Lesson Type</Label>
                <Select value={form.lesson_type} onValueChange={v => setForm({ ...form, lesson_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LESSON_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price, Currency, Duration */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Price (per session)</Label>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (<SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" min="15" step="15" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                </div>
              </div>

              {/* Recurring Config */}
              {form.lesson_type === 'recurring' && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <Repeat className="h-4 w-4" /> Recurring Settings
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Frequency</Label>
                        <Select value={form.recurring_frequency} onValueChange={v => setForm({ ...form, recurring_frequency: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Total Sessions</Label>
                        <Input type="number" min="2" max="52" className="h-8 text-sm" value={form.recurring_sessions} onChange={e => setForm({ ...form, recurring_sessions: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Series Price (optional)</Label>
                        <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={form.recurring_series_price} onChange={e => setForm({ ...form, recurring_series_price: e.target.value })} placeholder="Leave blank = per session" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Group Config */}
              {form.lesson_type === 'group' && (
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Max Students</Label>
                  <Input type="number" min="2" max="50" value={form.max_students} onChange={e => setForm({ ...form, max_students: e.target.value })} />
                </div>
              )}

              {/* Buffer & Policy */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Buffer Time (min)</Label>
                  <Select value={form.buffer_minutes} onValueChange={v => setForm({ ...form, buffer_minutes: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 30, 45, 60].map(m => (
                        <SelectItem key={m} value={String(m)}>{m === 0 ? 'No buffer' : `${m} min`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Cancel Policy</Label>
                  <Select value={form.cancellation_policy_hours} onValueChange={v => setForm({ ...form, cancellation_policy_hours: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 6, 12, 24, 48, 72].map(h => (
                        <SelectItem key={h} value={String(h)}>{h === 0 ? 'No policy' : `${h}h notice`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={form.allow_rescheduling} onCheckedChange={v => setForm({ ...form, allow_rescheduling: v })} id="allow-reschedule" />
                    <Label htmlFor="allow-reschedule" className="text-sm">Allow Rescheduling</Label>
                  </div>
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
            const lt = (lesson as any).lesson_type || 'single';
            const rc = (lesson as any).recurring_config;
            const maxStudents = (lesson as any).max_students || 1;
            const bufferMin = (lesson as any).buffer_minutes || 0;

            return (
              <Card key={lesson.id} className={!lesson.active ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{lesson.title}</h3>
                      {lt !== 'single' && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {lt === 'recurring' ? <><Repeat className="h-3 w-3 mr-0.5" /> Series</> : <><Users className="h-3 w-3 mr-0.5" /> Group</>}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span>{symbol}{lesson.price || 0}{lt === 'recurring' && rc?.series_price ? ` (series: ${symbol}${rc.series_price})` : ''}</span>
                      <span>·</span>
                      <span>{lesson.duration_minutes} min</span>
                      {bufferMin > 0 && <><span>·</span><span>{bufferMin}min buffer</span></>}
                      {lt === 'group' && maxStudents > 1 && <><span>·</span><span>Max {maxStudents} students</span></>}
                      {lt === 'recurring' && rc && <><span>·</span><span>{rc.total_sessions} sessions</span></>}
                      {!lesson.active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={lesson.active} onCheckedChange={() => toggleActive(lesson.id, lesson.active)} aria-label="Toggle active" />
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
