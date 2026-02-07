import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, MessageCircle, Users, Check, Clock, MoreHorizontal, Flag, Ban } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMembers, useConnectWithMember, useConnectionStatus, useCancelConnection } from '@/hooks/useMembers';
import { getProfileUrl } from '@/lib/profileUrl';
import { useCreateConversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { VerifiedBadge, isUserVerified } from '@/components/profile/VerifiedBadge';

function MemberCard({ member }: { member: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; business_name: string | null; username?: string | null; email_verified?: boolean | null } }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: connectionStatus, isLoading: loadingStatus } = useConnectionStatus(member.id);
  const connectMutation = useConnectWithMember();
  const cancelConnectionMutation = useCancelConnection();
  const createConversation = useCreateConversation();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('other');
  const [reportDetails, setReportDetails] = useState('');
  
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const handleConnect = () => {
    connectMutation.mutate(member.id);
  };
  
  const handleMessage = async () => {
    if (!user) return;
    const conversationId = await createConversation.mutateAsync(member.id);
    if (conversationId) {
      navigate(`/messages?conversation=${conversationId}`);
    }
  };

  const handleReport = () => {
    createReport.mutate({
      reportType: 'user',
      reason: reportReason,
      reportedUserId: member.id,
      details: reportDetails,
    }, {
      onSuccess: () => {
        setReportDialogOpen(false);
        setReportReason('other');
        setReportDetails('');
      }
    });
  };

  const handleBlock = () => {
    blockUser.mutate(member.id);
  };

  const isOwnProfile = user?.id === member.id;
  
  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Link to={getProfileUrl(member.id, member.username)}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <Link to={getProfileUrl(member.id, member.username)} className="hover:underline">
                  <h4 className="font-semibold truncate flex items-center gap-1">
                    {member.full_name || 'Anonymous'}
                    {isUserVerified(member) && <VerifiedBadge size="sm" />}
                  </h4>
                </Link>
                {user && !isOwnProfile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                        <Flag className="h-4 w-4 mr-2" />
                        Report User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                        <Ban className="h-4 w-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {member.business_name && (
                <p className="text-sm text-muted-foreground truncate">{member.business_name}</p>
              )}
              {member.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{member.bio}</p>
              )}
            </div>
          </div>
          
          {!isOwnProfile && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              {loadingStatus ? (
                <Skeleton className="h-9 w-24" />
              ) : connectionStatus?.isFriend ? (
                <>
                  <Button size="sm" variant="outline" disabled className="flex-1">
                    <Check className="h-4 w-4 mr-1" />
                    Connected
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMessage}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              ) : connectionStatus?.pendingRequest ? (
                connectionStatus.pendingRequest.sentByMe ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => cancelConnectionMutation.mutate(connectionStatus.pendingRequest!.id)}
                    disabled={cancelConnectionMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Cancel Request
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="flex-1">
                    <Clock className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                )
              ) : (
                <>
                  <Button 
                    size="sm" 
                    onClick={handleConnect} 
                    disabled={connectMutation.isPending}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMessage}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Report {member.full_name || 'this user'} for violating community guidelines
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                placeholder="Provide more context..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={createReport.isPending}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MembersList() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: members, isLoading } = useMembers(searchQuery);
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : members?.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search' : 'No other members yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members?.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
