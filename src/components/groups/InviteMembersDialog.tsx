import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Search, Clock, Check, X, Loader2 } from 'lucide-react';
import { useSearchUsers, useInviteToGroup, useGroupPendingInvites, useCancelInvite } from '@/hooks/useGroupInvites';
import { formatDistanceToNow } from 'date-fns';

interface InviteMembersDialogProps {
  groupId: string;
  groupName: string;
}

export function InviteMembersDialog({ groupId, groupName }: InviteMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: searchResults, isLoading: searching } = useSearchUsers(searchQuery, groupId);
  const { data: pendingInvites } = useGroupPendingInvites(groupId);
  const inviteUser = useInviteToGroup();
  const cancelInvite = useCancelInvite();
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const handleInvite = async (userId: string) => {
    await inviteUser.mutateAsync({ groupId, userId });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {groupName}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Users</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingInvites && pendingInvites.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingInvites.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!searching && searchQuery.length >= 2 && searchResults?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
              
              {searchResults?.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {user.is_member ? (
                    <Badge variant="outline">Member</Badge>
                  ) : user.is_invited ? (
                    <Badge variant="secondary">Invited</Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleInvite(user.id)}
                      disabled={inviteUser.isPending}
                    >
                      Invite
                    </Button>
                  )}
                </div>
              ))}
              
              {!searchQuery && (
                <p className="text-center text-muted-foreground py-4">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="pending" className="mt-4">
            <div className="max-h-[350px] overflow-y-auto space-y-2">
              {pendingInvites?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No pending invites</p>
              )}
              
              {pendingInvites?.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <Avatar>
                    <AvatarImage src={invite.profile?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(invite.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{invite.profile?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvite.mutate({ inviteId: invite.id, groupId })}
                    disabled={cancelInvite.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
