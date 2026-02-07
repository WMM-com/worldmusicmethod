import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileUrl } from '@/lib/profileUrl';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { UserPlus, UserCheck, Clock, User } from 'lucide-react';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { useConnectionStatus, useConnectWithMember } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';

interface UserHoverCardProps {
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  username?: string | null;
  isVerified?: boolean;
  children: React.ReactNode;
}

export function UserHoverCard({ userId, userName, avatarUrl, username, isVerified, children }: UserHoverCardProps) {
  const { user } = useAuth();
  const profileUrl = getProfileUrl(userId, username);
  const { data: connectionStatus, isLoading: loadingStatus } = useConnectionStatus(userId);
  const connectMutation = useConnectWithMember();
  const [isOpen, setIsOpen] = useState(false);

  const isOwnProfile = user?.id === userId;
  const isFriend = connectionStatus?.isFriend;
  const hasPendingRequest = connectionStatus?.pendingRequest;

  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleConnect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    connectMutation.mutate(userId);
  };

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link 
          to={profileUrl} 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-72 p-4" 
        side="top" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate flex items-center gap-1">
                {userName || 'Unknown'}
                {isVerified && <VerifiedBadge size="sm" />}
              </p>
            </div>
          </div>

          {!isOwnProfile && user && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {loadingStatus ? (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Clock className="h-4 w-4 mr-1.5 animate-pulse" />
                    Loading...
                  </Button>
                ) : isFriend ? (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Connected
                  </Button>
                ) : hasPendingRequest ? (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Clock className="h-4 w-4 mr-1.5" />
                    Pending
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleConnect}
                    disabled={connectMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Connect
                  </Button>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <Link to={profileUrl}>
                  <User className="h-4 w-4 mr-1.5" />
                  View Profile
                </Link>
              </Button>
            </div>
          )}

          {isOwnProfile && (
            <Button variant="outline" size="sm" asChild>
              <Link to={profileUrl}>
                <User className="h-4 w-4 mr-2" />
                View Your Profile
              </Link>
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
