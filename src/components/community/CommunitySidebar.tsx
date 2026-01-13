import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, RefreshCw, Star, Music2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityFeedPlaylist } from './CommunityFeedPlaylist';

interface CommunitySidebarProps {
  onPostTypeSelect?: (type: string) => void;
}

const POST_TYPES = [
  {
    type: 'statement',
    label: 'Statement',
    icon: Megaphone,
    description: 'Share your beliefs',
    color: 'text-red-500',
  },
  {
    type: 'update',
    label: 'Update',
    icon: RefreshCw,
    description: 'News for your network',
    color: 'text-blue-500',
  },
  {
    type: 'recommendation',
    label: 'Recommendation',
    icon: Star,
    description: 'Share something great',
    color: 'text-yellow-500',
  },
  {
    type: 'practice',
    label: 'Practice Room',
    icon: Music2,
    description: 'Show your practice',
    color: 'text-green-500',
  },
];

export function CommunitySidebar({ onPostTypeSelect }: CommunitySidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePostTypeClick = (type: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    onPostTypeSelect?.(type);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Create Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {POST_TYPES.map((postType) => {
            const Icon = postType.icon;
            return (
              <Button
                key={postType.type}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2"
                onClick={() => handlePostTypeClick(postType.type)}
              >
                <Icon className={`h-4 w-4 ${postType.color}`} />
                <div className="text-left">
                  <div className="text-sm font-medium">{postType.label}</div>
                  <div className="text-xs text-muted-foreground">{postType.description}</div>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Featured Playlist */}
      <CommunityFeedPlaylist />
    </div>
  );
}
