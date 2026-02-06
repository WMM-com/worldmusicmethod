import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfileUrl } from '@/lib/profileUrl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Check, X, UserMinus } from 'lucide-react';
import {
  useFriendships,
  useSearchUsers,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useRemoveFriend,
} from '@/hooks/useSocial';

export function FriendsList() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: friendships, isLoading } = useFriendships();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const sendRequestMutation = useSendFriendRequest();
  const respondMutation = useRespondToFriendRequest();
  const removeMutation = useRemoveFriend();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for people..."
            className="pl-9"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border bg-accent/5">
            <p className="text-sm font-medium text-muted-foreground">Search Results</p>
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                {isAlreadyFriend(user.id) ? (
                  <Badge variant="secondary">Friends</Badge>
                ) : hasPendingRequest(user.id) ? (
                  <Badge variant="outline">Pending</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendRequestMutation.mutate(user.id)}
                    disabled={sendRequestMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="friends">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              Friends ({friendships?.friends.length || 0})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {friendships?.requests.length ? (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {friendships.requests.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({friendships?.pending.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : friendships?.friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No friends yet. Search for people to connect with.
              </p>
            ) : (
              <div className="space-y-2">
                {friendships?.friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <Link to={getProfileUrl(friend.other_user_id || friend.friend_id, friend.profiles?.username)} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
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
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            {friendships?.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending friend requests
              </p>
            ) : (
              <div className="space-y-2">
                {friendships?.requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.profiles?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(request.profiles?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: true })}
                        disabled={respondMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondMutation.mutate({ friendshipId: request.id, accept: false })}
                        disabled={respondMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {friendships?.pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending requests sent
              </p>
            ) : (
              <div className="space-y-2">
                {friendships?.pending.map((pending) => (
                  <div key={pending.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pending.profiles?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(pending.profiles?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{pending.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">Request pending</p>
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
