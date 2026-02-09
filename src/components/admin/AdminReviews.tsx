import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Check, X, Pencil, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type FilterStatus = ReviewStatus | 'all';

interface ReviewRow {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  prompt_question: string | null;
  prompt_answer: string | null;
  status: string | null;
  created_at: string;
  course_title?: string;
  user_name?: string;
}

function useAdminReviews(filter: FilterStatus) {
  return useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const reviews = data ?? [];
      if (reviews.length === 0) return [];

      // Fetch course titles and user names
      const courseIds = [...new Set(reviews.map(r => r.course_id))];
      const userIds = [...new Set(reviews.map(r => r.user_id))];

      const [coursesRes, profilesRes] = await Promise.all([
        supabase.from('courses').select('id, title').in('id', courseIds),
        supabase.from('profiles').select('id, full_name').in('id', userIds),
      ]);

      const courseMap = new Map(coursesRes.data?.map(c => [c.id, c.title]) ?? []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p.full_name]) ?? []);

      return reviews.map(r => ({
        ...r,
        course_title: courseMap.get(r.course_id) ?? 'Unknown Course',
        user_name: profileMap.get(r.user_id) ?? 'Unknown User',
      })) as ReviewRow[];
    },
  });
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  approved: 'bg-green-500/10 text-green-700 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export function AdminReviews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editReview, setEditReview] = useState<ReviewRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Edit form state
  const [editRating, setEditRating] = useState(0);
  const [editPromptQ, setEditPromptQ] = useState('');
  const [editPromptA, setEditPromptA] = useState('');
  const [editText, setEditText] = useState('');

  const { data: reviews, isLoading } = useAdminReviews(filter);

  const invalidateReviews = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['course-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['course-avg-rating'] });
    queryClient.invalidateQueries({ queryKey: ['course-reviews-count'] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ReviewStatus }) => {
      const { error } = await supabase
        .from('reviews')
        .update({ status, approved_by: status === 'approved' ? user?.id : null } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, { status, ids }) => {
      invalidateReviews();
      setSelected(new Set());
      toast({ title: `${ids.length} review(s) ${status}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateReview = useMutation({
    mutationFn: async (review: ReviewRow) => {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: editRating,
          prompt_question: editPromptQ || null,
          prompt_answer: editPromptA || null,
          review_text: editText || null,
        })
        .eq('id', review.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateReviews();
      setEditReview(null);
      toast({ title: 'Review updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateReviews();
      setDeleteId(null);
      toast({ title: 'Review deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!reviews) return;
    if (selected.size === reviews.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reviews.map(r => r.id)));
    }
  };

  const openEdit = (r: ReviewRow) => {
    setEditReview(r);
    setEditRating(r.rating);
    setEditPromptQ(r.prompt_question ?? '');
    setEditPromptA(r.prompt_answer ?? '');
    setEditText(r.review_text ?? '');
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filters.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => { setFilter(f.value); setSelected(new Set()); }}
          >
            {f.label}
          </Button>
        ))}

        {selected.size > 0 && (
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus.mutate({ ids: [...selected], status: 'approved' })}>
              <Check className="h-4 w-4 mr-1" /> Approve ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus.mutate({ ids: [...selected], status: 'rejected' })}>
              <X className="h-4 w-4 mr-1" /> Reject ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={reviews && reviews.length > 0 && selected.size === reviews.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="hidden lg:table-cell">Question</TableHead>
                  <TableHead className="hidden lg:table-cell">Answer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : !reviews || reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reviews found</TableCell>
                  </TableRow>
                ) : reviews.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-medium">{r.course_title}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{r.user_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn('w-4 h-4', r.rating >= s ? 'fill-secondary text-secondary' : 'text-muted-foreground/30')} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[180px] truncate text-sm text-muted-foreground">{r.prompt_question || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[180px] truncate text-sm">{r.prompt_answer || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[r.status ?? 'pending']}>
                        {r.status ?? 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {r.status !== 'approved' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => updateStatus.mutate({ ids: [r.id], status: 'approved' })}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status !== 'rejected' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => updateStatus.mutate({ ids: [r.id], status: 'rejected' })}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editReview} onOpenChange={(open) => !open && setEditReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setEditRating(s)}>
                    <Star className={cn('w-6 h-6 cursor-pointer', editRating >= s ? 'fill-secondary text-secondary' : 'text-muted-foreground/30')} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Prompt Question</Label>
              <Input value={editPromptQ} onChange={e => setEditPromptQ(e.target.value)} />
            </div>
            <div>
              <Label>Prompt Answer</Label>
              <Textarea value={editPromptA} onChange={e => setEditPromptA(e.target.value)} />
            </div>
            <div>
              <Label>Additional Comments</Label>
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReview(null)}>Cancel</Button>
            <Button onClick={() => editReview && updateReview.mutate(editReview)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteReview.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
