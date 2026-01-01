import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Lock, EyeOff, Music, Guitar, Mic2, MapPin } from 'lucide-react';
import { useJoinGroup, useLeaveGroup, useRequestToJoin } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_LABELS, type Group, type GroupCategory } from '@/types/groups';

interface GroupCardProps {
  group: Group;
}

const CATEGORY_ICONS: Partial<Record<GroupCategory, React.ReactNode>> = {
  genre: <Music className="h-4 w-4" />,
  instrument: <Guitar className="h-4 w-4" />,
  collaboration: <Mic2 className="h-4 w-4" />,
  local: <MapPin className="h-4 w-4" />,
};

export function GroupCard({ group }: GroupCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const requestToJoin = useRequestToJoin();
  
  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (group.privacy === 'public') {
      joinGroup.mutate(group.id);
    } else if (group.privacy === 'private') {
      requestToJoin.mutate({ groupId: group.id });
    }
  };
  
  const handleLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    leaveGroup.mutate(group.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      navigate('/auth');
    }
  };
  
  return (
    <Link to={`/community/groups/${group.id}`} onClick={handleCardClick}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
        {group.cover_image_url && (
          <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/10 relative">
            <img 
              src={group.cover_image_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!group.cover_image_url && (
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
            <Users className="h-10 w-10 text-primary/40" />
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{group.name}</h3>
                {group.privacy === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
                {group.privacy === 'secret' && <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="h-3 w-3" />
                <span>{group.member_count || 0} members</span>
                {group.subcategory && (
                  <>
                    <span>•</span>
                    <span>{group.subcategory}</span>
                  </>
                )}
              </div>
              
              {group.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {group.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_ICONS[group.category]}
              <span className="ml-1">{CATEGORY_LABELS[group.category]}</span>
            </Badge>
            
            {group.is_member ? (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
              >
                Joined
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={handleJoin}
                disabled={joinGroup.isPending || requestToJoin.isPending || group.privacy === 'secret'}
              >
                {group.privacy === 'private' ? 'Request' : 'Join'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
