import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Flag, User, FileText, Check, X, Clock, AlertTriangle, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  report_type: 'user' | 'post';
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter?: { full_name: string | null; avatar_url: string | null; email: string | null };
  reported_user?: { full_name: string | null; avatar_url: string | null; email: string | null };
}

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocker?: { full_name: string | null; avatar_url: string | null };
  blocked?: { full_name: string | null; avatar_url: string | null };
}

const reasonLabels: Record<string, string> = {
  too_negative: 'Too Negative',
  annoying: 'Annoying',
  using_ai: 'Using A.I.',
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate Content',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  reviewed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

export function AdminReports() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reporter and reported user profiles
      const reporterIds = [...new Set(data.map(r => r.reporter_id))];
      const reportedUserIds = [...new Set(data.filter(r => r.reported_user_id).map(r => r.reported_user_id))];
      const allUserIds = [...new Set([...reporterIds, ...reportedUserIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', allUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(report => ({
        ...report,
        reporter: profilesMap.get(report.reporter_id),
        reported_user: report.reported_user_id ? profilesMap.get(report.reported_user_id) : null,
      })) as Report[];
    },
  });

  const { data: blocks } = useQuery({
    queryKey: ['admin-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allUserIds = [...new Set(data.flatMap(b => [b.blocker_id, b.blocked_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(block => ({
        ...block,
        blocker: profilesMap.get(block.blocker_id),
        blocked: profilesMap.get(block.blocked_id),
      })) as UserBlock[];
    },
  });

  const updateReportStatus = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report status updated');
    },
    onError: () => {
      toast.error('Failed to update report');
    },
  });

  const removeBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocks'] });
      toast.success('Block removed');
    },
    onError: () => {
      toast.error('Failed to remove block');
    },
  });

  const pendingCount = reports?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Moderation</h2>
          <p className="text-muted-foreground">Manage user reports and blocks</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="blocks" className="gap-2">
            <Ban className="h-4 w-4" />
            User Blocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">All Reports</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading reports...</p>
              ) : reports?.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No reports found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {report.report_type === 'user' ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            {report.report_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={report.reporter?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {report.reporter?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate max-w-[120px]">
                              {report.reporter?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.reported_user ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={report.reported_user?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {report.reported_user?.full_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[120px]">
                                {report.reported_user?.full_name || 'Unknown'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Post #{report.reported_post_id?.slice(0, 8)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="secondary">{reasonLabels[report.reason] || report.reason}</Badge>
                            {report.details && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                {report.details}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[report.status]}>
                            {report.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {report.status === 'resolved' && <Check className="h-3 w-3 mr-1" />}
                            {report.status === 'dismissed' && <X className="h-3 w-3 mr-1" />}
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => updateReportStatus.mutate({ reportId: report.id, status: 'resolved' })}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => updateReportStatus.mutate({ reportId: report.id, status: 'dismissed' })}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Dismiss
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Blocks</CardTitle>
              <CardDescription>Users who have blocked other users</CardDescription>
            </CardHeader>
            <CardContent>
              {blocks?.length === 0 ? (
                <div className="text-center py-12">
                  <Ban className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No blocks recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Blocker</TableHead>
                      <TableHead>Blocked User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks?.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={block.blocker?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {block.blocker?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {block.blocker?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={block.blocked?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {block.blocked?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {block.blocked?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(block.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Remove Block
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Block?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will allow {block.blocked?.full_name} to interact with {block.blocker?.full_name} again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeBlock.mutate(block.id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}