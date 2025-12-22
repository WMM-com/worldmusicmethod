import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Check, X, UserMinus, Users, UserX, ShieldOff, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useFriendships,
  useSearchUsers,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useRemoveFriend,
} from '@/hooks/useSocial';
import { useBlockedUsers, useUnblockUser } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function FriendsTab() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: friendships, isLoading } = useFriendships();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const { data: blockedUserIds } = useBlockedUsers();
  const sendRequestMutation = useSendFriendRequest();
  const respondMutation = useRespondToFriendRequest();
  const removeMutation = useRemoveFriend();
  const unblockMutation = useUnblockUser();

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
    <div className="space-y-6 max-w-4xl mx-auto">
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
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <Link to={`/profile/${user.id}`} className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </Link>
                  {isAlreadyFriend(user.id) ? (
                    <Badge variant="secondary">Friends</Badge>
                  ) : hasPendingRequest(user.id) ? (
                    <Badge variant="outline">Pending</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendRequestMutation.mutate(user.id)}
                      disabled={sendRequestMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
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
      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="friends" className="gap-2">
            <Users className="h-4 w-4" />
            Friends ({friendships?.friends.length || 0})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {friendships?.requests.length ? (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-1 text-xs">
                {friendships.requests.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending ({friendships?.pending.length || 0})
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <UserX className="h-4 w-4" />
            Blocked ({blockedUserIds?.length || 0})
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
                  {friendships?.friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <Link to={`/profile/${friend.friend_id}`} className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(friend.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{friend.profiles?.email}</p>
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(friend.id)}
                        disabled={removeMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
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
                  {friendships?.requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <Link to={`/profile/${request.user_id}`} className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(request.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">wants to be friends</p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: true })}
                          disabled={respondMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: false })}
                          disabled={respondMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  {friendships?.pending.map((pending) => (
                    <div key={pending.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <Link to={`/profile/${pending.friend_id}`} className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={pending.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(pending.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{pending.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">Request pending</p>
                        </div>
                      </Link>
                      <Badge variant="outline">Awaiting response</Badge>
                    </div>
                  ))}
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
                    <div key={blockedUser.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={blockedUser.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(blockedUser.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{blockedUser.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{blockedUser.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => unblockMutation.mutate(blockedUser.id)}
                        disabled={unblockMutation.isPending}
                      >
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}