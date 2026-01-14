import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Check, X, UserMinus, Users, UserX, ShieldOff, LogIn, MessageCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useFriendships,
  useSearchUsers,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useRemoveFriend,
  useCancelFriendRequest,
} from '@/hooks/useSocial';
import { useBlockedUsers, useUnblockUser } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateConversation } from '@/hooks/useMessaging';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function FriendsTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removeConfirmName, setRemoveConfirmName] = useState<string>('');
  
  // Check if we should default to a specific section (e.g., from notification click)
  const sectionParam = searchParams.get('section');
  const defaultTab = sectionParam === 'requests' ? 'requests' : 'friends';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Update active tab when section param changes
  useEffect(() => {
    if (sectionParam === 'requests') {
      setActiveTab('requests');
    }
  }, [sectionParam]);
  
  const { data: friendships, isLoading } = useFriendships();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const { data: blockedUserIds } = useBlockedUsers();
  const sendRequestMutation = useSendFriendRequest();
  const respondMutation = useRespondToFriendRequest();
  const removeMutation = useRemoveFriend();
  const cancelRequestMutation = useCancelFriendRequest();
  const unblockMutation = useUnblockUser();
  const createConversationMutation = useCreateConversation();

  // Fetch profiles for blocked users
  const { data: blockedProfiles } = useQuery({
    queryKey: ['blocked-profiles', blockedUserIds],
    queryFn: async () => {
      if (!blockedUserIds || blockedUserIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', blockedUserIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!blockedUserIds && blockedUserIds.length > 0,
  });

  const getInitials = (name: string | null | undefined) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || '?';
  };

  const isAlreadyFriend = (userId: string) => {
    return friendships?.friends.some(f => 
      f.user_id === userId || f.friend_id === userId
    );
  };

  const hasPendingRequest = (userId: string) => {
    return friendships?.pending.some(f => f.friend_id === userId) ||
           friendships?.requests.some(f => f.user_id === userId);
  };

  const handleSendMessage = async (userId: string) => {
    try {
      const conversationId = await createConversationMutation.mutateAsync(userId);
      navigate(`/messages?id=${conversationId}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRemoveConfirm = () => {
    if (removeConfirmId) {
      removeMutation.mutate(removeConfirmId, {
        onSuccess: () => {
          setRemoveConfirmId(null);
          setRemoveConfirmName('');
        },
      });
    }
  };

  // Helper to get the other user's ID from a friendship
  const getOtherUserId = (friendship: any) => {
    return friendship.other_user_id || (friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Sign in to manage friends</h3>
          <p className="text-muted-foreground mb-4">
            Connect with other musicians in the community.
          </p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto overflow-hidden">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find People</CardTitle>
          <CardDescription>Search for people to connect with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card overflow-hidden">
                  <Link to={`/profile/${searchUser.id}`} className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={searchUser.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(searchUser.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate max-w-[150px] sm:max-w-none">{searchUser.full_name || 'Unknown'}</p>
                    </div>
                  </Link>
                  {isAlreadyFriend(searchUser.id) ? (
                    <Badge variant="secondary" className="shrink-0">Friends</Badge>
                  ) : hasPendingRequest(searchUser.id) ? (
                    <Badge variant="outline" className="shrink-0">Pending</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendRequestMutation.mutate(searchUser.id)}
                      disabled={sendRequestMutation.isPending}
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Friend</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults?.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground text-center py-4">
              No users found matching "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto bg-accent/20">
          <TabsTrigger value="friends" className="gap-1 text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate">Friends ({friendships?.friends.length || 0})</span>
            <span className="sm:hidden">{friendships?.friends.length || 0}</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1 text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <span className="hidden sm:inline truncate">Requests</span>
            <span className="sm:hidden">Req</span>
            {friendships?.requests.length ? (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-1 text-xs shrink-0">
                {friendships.requests.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <span className="hidden sm:inline truncate">Pending ({friendships?.pending.length || 0})</span>
            <span className="sm:hidden">{friendships?.pending.length || 0}</span>
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-1 text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <UserX className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate">Blocked ({blockedUserIds?.length || 0})</span>
            <span className="sm:hidden">{blockedUserIds?.length || 0}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : friendships?.friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground">
                    Search for people above to start connecting
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {friendships?.friends.map((friend) => {
                    const otherUserId = getOtherUserId(friend);
                    return (
                      <div key={friend.id} className="flex items-center justify-between gap-2 p-4 rounded-lg border overflow-hidden">
                        <Link to={`/profile/${otherUserId}`} className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                            <AvatarImage src={friend.profiles?.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(friend.profiles?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate max-w-[120px] sm:max-w-none">{friend.profiles?.full_name || 'Unknown'}</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendMessage(otherUserId)}
                            disabled={createConversationMutation.isPending}
                            className="hidden sm:flex"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSendMessage(otherUserId)}
                            disabled={createConversationMutation.isPending}
                            className="sm:hidden h-8 w-8"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRemoveConfirmId(friend.id);
                              setRemoveConfirmName(friend.profiles?.full_name || 'this friend');
                            }}
                            className="hidden sm:flex text-destructive hover:text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setRemoveConfirmId(friend.id);
                              setRemoveConfirmName(friend.profiles?.full_name || 'this friend');
                            }}
                            className="sm:hidden h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-6">
              {friendships?.requests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    Friend requests will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {friendships?.requests.map((request) => {
                    const otherUserId = getOtherUserId(request);
                    return (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
                        <Link to={`/profile/${otherUserId}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                            <AvatarImage src={request.profiles?.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(request.profiles?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{request.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">wants to be friends</p>
                          </div>
                        </Link>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: true })}
                            disabled={respondMutation.isPending}
                          >
                            <Check className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Accept</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: false })}
                            disabled={respondMutation.isPending}
                          >
                            <X className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Decline</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {friendships?.pending.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    Requests you've sent will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {friendships?.pending.map((pending) => {
                    const otherUserId = getOtherUserId(pending);
                    return (
                      <div key={pending.id} className="flex items-center justify-between gap-2 p-4 rounded-lg border">
                        <Link to={`/profile/${otherUserId}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                            <AvatarImage src={pending.profiles?.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(pending.profiles?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{pending.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">Request pending</p>
                          </div>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelRequestMutation.mutate(pending.id)}
                          disabled={cancelRequestMutation.isPending}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Cancel</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardContent className="pt-6">
              {!blockedProfiles || blockedProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No blocked users</h3>
                  <p className="text-muted-foreground">
                    Users you block will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {blockedProfiles.map((blockedUser) => (
                    <div key={blockedUser.id} className="flex items-center justify-between gap-2 p-4 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                          <AvatarImage src={blockedUser.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(blockedUser.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{blockedUser.full_name || 'Unknown'}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockMutation.mutate(blockedUser.id)}
                        disabled={unblockMutation.isPending}
                        className="shrink-0"
                      >
                        <ShieldOff className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Unblock</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog open={!!removeConfirmId} onOpenChange={(open) => !open && setRemoveConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeConfirmName} from your friends list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove Friend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
