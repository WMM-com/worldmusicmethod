import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, MessageCircle, Users, Check, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMembers, useConnectWithMember, useConnectionStatus } from '@/hooks/useMembers';
import { useCreateConversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';

function MemberCard({ member }: { member: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; business_name: string | null } }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: connectionStatus, isLoading: loadingStatus } = useConnectionStatus(member.id);
  const connectMutation = useConnectWithMember();
  const createConversation = useCreateConversation();
  
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const handleConnect = () => {
    connectMutation.mutate(member.id);
  };
  
  const handleMessage = async () => {
    if (!user) return;
    const conversation = await createConversation.mutateAsync(member.id);
    if (conversation) {
      navigate(`/messages?conversation=${conversation.id}`);
    }
  };
  
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${member.id}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${member.id}`} className="hover:underline">
              <h4 className="font-semibold truncate">{member.full_name || 'Anonymous'}</h4>
            </Link>
            {member.business_name && (
              <p className="text-sm text-muted-foreground truncate">{member.business_name}</p>
            )}
            {member.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{member.bio}</p>
            )}
          </div>
        </div>
        
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
            <Button size="sm" variant="outline" disabled className="flex-1">
              <Clock className="h-4 w-4 mr-1" />
              {connectionStatus.pendingRequest.sentByMe ? 'Pending' : 'Respond'}
            </Button>
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
      </CardContent>
    </Card>
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
