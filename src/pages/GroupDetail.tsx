import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Users, Lock, EyeOff, Settings, 
  MessageSquare, Calendar, BarChart3, Pin, Megaphone,
  Send, ImageIcon, Music
} from 'lucide-react';
import { 
  useGroup, useGroupMembers, useGroupPosts, useGroupEvents, 
  useGroupPolls, useCreateGroupPost, useJoinGroup, useLeaveGroup 
} from '@/hooks/useGroups';
import { CATEGORY_LABELS } from '@/types/groups';
import { formatDistanceToNow, format } from 'date-fns';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [newPostContent, setNewPostContent] = useState('');
  
  const { data: group, isLoading: loadingGroup } = useGroup(groupId || '');
  const { data: members } = useGroupMembers(groupId || '');
  const { data: posts } = useGroupPosts(groupId || '');
  const { data: events } = useGroupEvents(groupId || '');
  const { data: polls } = useGroupPolls(groupId || '');
  
  const createPost = useCreateGroupPost();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !groupId) return;
    await createPost.mutateAsync({
      group_id: groupId,
      content: newPostContent,
    });
    setNewPostContent('');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  if (loadingGroup) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </>
    );
  }
  
  if (!group) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Group not found</h1>
            <Button onClick={() => navigate('/community')}>Back to Community</Button>
          </div>
        </div>
      </>
    );
  }
  
  const isAdmin = group.user_role === 'admin' || group.user_role === 'moderator';
  
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Cover Image */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative">
          {group.cover_image_url && (
            <img src={group.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
          {/* Group Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/community')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Community
              </Button>
              
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    {group.privacy === 'private' && <Lock className="h-5 w-5 text-muted-foreground" />}
                    {group.privacy === 'secret' && <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <Badge variant="secondary">{CATEGORY_LABELS[group.category]}</Badge>
                    {group.subcategory && <span>{group.subcategory}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {group.member_count} members
                    </span>
                  </div>
                  
                  {group.description && (
                    <p className="text-muted-foreground">{group.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {group.is_member ? (
                    <>
                      {isAdmin && (
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => leaveGroup.mutate(group.id)}
                        disabled={leaveGroup.isPending}
                      >
                        Leave Group
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => joinGroup.mutate(group.id)}
                      disabled={joinGroup.isPending || group.privacy === 'secret'}
                    >
                      {group.privacy === 'private' ? 'Request to Join' : 'Join Group'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Group Content */}
          {group.is_member ? (
            <Tabs defaultValue="posts" className="space-y-4">
              <TabsList>
                <TabsTrigger value="posts">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="polls">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Polls
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="space-y-4">
                {/* Create Post */}
                <Card>
                  <CardContent className="pt-4">
                    <Textarea
                      placeholder="Share something with the group..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Music className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim() || createPost.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Posts List */}
                {posts?.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={post.profile?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(post.profile?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{post.profile?.full_name || 'Anonymous'}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                            {post.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                            {post.is_announcement && <Megaphone className="h-3 w-3 text-orange-500" />}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
                          {post.media_url && (
                            <div className="mt-3">
                              {post.media_type === 'image' && (
                                <img src={post.media_url} alt="" className="rounded-lg max-h-96 object-cover" />
                              )}
                              {post.media_type === 'audio' && (
                                <audio src={post.media_url} controls className="w-full" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <button className="hover:text-foreground flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {post.comment_count || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {posts?.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No posts yet</h3>
                      <p className="text-muted-foreground">Be the first to share something!</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="members" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members?.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <Link to={`/profile/${member.user_id}`} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(member.profile?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{member.profile?.full_name || 'Anonymous'}</span>
                              {member.role !== 'member' && (
                                <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                              )}
                            </div>
                            {member.profile?.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{member.profile.bio}</p>
                            )}
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="events" className="space-y-4">
                {events?.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="text-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
                          <div className="text-xs text-primary font-medium">
                            {format(new Date(event.start_time), 'MMM')}
                          </div>
                          <div className="text-2xl font-bold">
                            {format(new Date(event.start_time), 'd')}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.start_time), 'EEEE, h:mm a')}
                          </p>
                          {event.location && (
                            <p className="text-sm text-muted-foreground">{event.location}</p>
                          )}
                          {event.description && (
                            <p className="mt-2 text-sm">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {events?.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No upcoming events</h3>
                      <p className="text-muted-foreground">Events will appear here when created</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="polls" className="space-y-4">
                {polls?.map((poll) => (
                  <Card key={poll.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{poll.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {poll.options.map((option, index) => {
                          const voteCount = poll.votes?.find(v => v.option_index === index)?.count || 0;
                          const totalVotes = poll.votes?.reduce((sum, v) => sum + v.count, 0) || 0;
                          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                          const hasVoted = poll.user_votes?.includes(index);
                          
                          return (
                            <div 
                              key={index}
                              className={`relative p-3 rounded-lg border ${hasVoted ? 'border-primary' : ''}`}
                            >
                              <div 
                                className="absolute inset-0 bg-primary/10 rounded-lg"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="relative flex justify-between">
                                <span>{option}</span>
                                <span className="text-sm text-muted-foreground">{percentage}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {poll.ends_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {polls?.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No polls yet</h3>
                      <p className="text-muted-foreground">Polls will appear here when created</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Join to see content</h3>
                <p className="text-muted-foreground">
                  You need to be a member to see posts, events, and polls in this group.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
