import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 30;

export function AdminEmailLogs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('email-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_send_log',
        },
        () => {
          // Invalidate and refetch when new logs arrive
          queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-email-logs', page, search, statusFilter, typeFilter, domainFilter],
    queryFn: async () => {
      // Query email_send_log which has the most comprehensive data
      let query = supabase
        .from('email_send_log')
        .select('*', { count: 'exact' })
        .order('sent_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filter by sender domain
      if (domainFilter !== 'all') {
        if (domainFilter === 'worldmusicmethod') {
          query = query.ilike('from_email', '%worldmusicmethod.com%');
        } else if (domainFilter === 'arts-admin') {
          query = query.ilike('from_email', '%arts-admin.com%');
        }
      }

      // Filter by email type based on subject patterns
      if (typeFilter !== 'all') {
        switch (typeFilter) {
          case 'password_reset':
            query = query.ilike('subject', '%password%');
            break;
          case 'verification':
            query = query.ilike('subject', '%verify%');
            break;
          case 'order':
            query = query.ilike('subject', '%order%');
            break;
          case 'invoice':
            query = query.ilike('subject', '%invoice%');
            break;
          case 'renewal':
            query = query.ilike('subject', '%renew%');
            break;
          case 'campaign':
            // Campaign emails don't match the transactional patterns
            query = query.not('subject', 'ilike', '%password%')
              .not('subject', 'ilike', '%verify%')
              .not('subject', 'ilike', '%order%')
              .not('subject', 'ilike', '%invoice%')
              .not('subject', 'ilike', '%renew%');
            break;
        }
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data: logs, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: logs || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      };
    },
  });

  const getEmailType = (subject: string): { label: string; color: string } => {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('password') || subjectLower.includes('reset')) {
      return { label: 'Password Reset', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    if (subjectLower.includes('verify') || subjectLower.includes('verification')) {
      return { label: 'Verification', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    if (subjectLower.includes('order') || subjectLower.includes('confirmed')) {
      return { label: 'Order', color: 'bg-green-100 text-green-800 border-green-200' };
    }
    if (subjectLower.includes('invoice')) {
      return { label: 'Invoice', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    if (subjectLower.includes('renew') || subjectLower.includes('subscription')) {
      return { label: 'Renewal', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
    }
    return { label: 'Campaign', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'opened':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Opened</Badge>;
      case 'clicked':
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Clicked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>View all sent emails and their status</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or subject..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="worldmusicmethod">worldmusicmethod.com</SelectItem>
                <SelectItem value="arts-admin">arts-admin.com</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="verification">Verification</SelectItem>
                <SelectItem value="order">Order Confirmation</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="renewal">Renewal</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No email logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((log: { id: string; sent_at: string; subject: string; from_email?: string; email: string; status: string; error_message?: string }) => {
                    const emailType = getEmailType(log.subject);
                    const senderDomain = log.from_email?.includes('arts-admin') 
                      ? 'Left Brain' 
                      : log.from_email?.includes('worldmusicmethod') 
                        ? 'WMM' 
                        : '-';
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={emailType.color}>
                            {emailType.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary" className={senderDomain === 'Left Brain' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
                            {senderDomain}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">
                          {log.email}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium">
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-destructive">
                          {log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
