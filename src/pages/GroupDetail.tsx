import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Users, Lock, EyeOff, Settings, 
  MessageSquare, Calendar, BarChart3, Trash2, Hash, ClipboardList,
  Pin, PinOff, MoreHorizontal, Pencil
} from 'lucide-react';
import { 
  useGroup, useGroupMembers, useGroupPosts, useGroupEvents, 
  useGroupPolls, useJoinGroup, useLeaveGroup,
  useVoteOnPoll, useUpdateGroup, useDeleteGroup,
  useUpdateGroupPoll, useDeleteGroupPoll, useUpdateGroupPost
} from '@/hooks/useGroups';
import { useGroupPinnedAudio } from '@/hooks/usePinnedAudio';
import { useGroupChannels } from '@/hooks/useGroupChannels';
import { useGroupQuestionnaires, useUpdateQuestionnaire, useDeleteQuestionnaire } from '@/hooks/useQuestionnaires';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_LABELS, type GroupSettings, type GroupPoll } from '@/types/groups';
import { formatDistanceToNow, format } from 'date-fns';
import { CreateEventDialog } from '@/components/groups/CreateEventDialog';
import { CreatePollDialog } from '@/components/groups/CreatePollDialog';
import { CreateQuestionnaireDialog } from '@/components/groups/CreateQuestionnaireDialog';
import { EditQuestionnaireDialog } from '@/components/groups/EditQuestionnaireDialog';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { GroupPostCard } from '@/components/groups/GroupPostCard';
import { InviteMembersDialog } from '@/components/groups/InviteMembersDialog';
import { GroupCoverUpload } from '@/components/groups/GroupCoverUpload';
import { PinnedAudioPlayer } from '@/components/groups/PinnedAudioPlayer';
import { PinAudioDialog } from '@/components/groups/PinAudioDialog';
import { CreateGroupPost } from '@/components/groups/CreateGroupPost';
import { ChannelList } from '@/components/groups/ChannelList';
import type { Questionnaire } from '@/hooks/useQuestionnaires';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);
  
  const { data: group, isLoading: loadingGroup } = useGroup(groupId || '');
  const { data: members } = useGroupMembers(groupId || '');
  const { data: posts } = useGroupPosts(groupId || '', selectedChannelId || undefined);
  const { data: events } = useGroupEvents(groupId || '');
  const { data: polls } = useGroupPolls(groupId || '', selectedChannelId);
  const { data: pinnedAudio } = useGroupPinnedAudio(groupId || '');
  const { data: channels } = useGroupChannels(groupId || '');
  const { data: questionnaires } = useGroupQuestionnaires(groupId || '', selectedChannelId);
  const { user, isAdmin: isSiteAdmin } = useAuth();
  
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const voteOnPoll = useVoteOnPoll();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const updatePoll = useUpdateGroupPoll();
  const deletePoll = useDeleteGroupPoll();
  const updatePost = useUpdateGroupPost();
  const updateQuestionnaire = useUpdateQuestionnaire();
  const deleteQuestionnaire = useDeleteQuestionnaire();
  
  const canDeleteGroup = group && (group.created_by === user?.id || isSiteAdmin);
  
  const handleVote = (pollId: string, optionIndex: number) => {
    if (!groupId) return;
    voteOnPoll.mutate({ pollId, optionIndex, groupId });
  };
  
  const handleCoverUpload = async (url: string) => {
    if (!groupId) return;
    await updateGroup.mutateAsync({
      groupId,
      updates: { cover_image_url: url }
    });
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
  const settings = (group.settings || {}) as GroupSettings;
  
  const canPost = group.is_member && (
    settings.who_can_post === 'all_members' ||
    (settings.who_can_post === 'admins_and_moderators' && isAdmin) ||
    (settings.who_can_post === 'admins_only' && group.user_role === 'admin')
  );
  
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Cover Image */}
        {isAdmin ? (
          <GroupCoverUpload 
            groupId={group.id} 
            currentCoverUrl={group.cover_image_url} 
            onUpload={handleCoverUpload}
          />
        ) : (
          <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative">
            {group.cover_image_url && (
              <img src={group.cover_image_url} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}
        
        <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
          {/* Group Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/community?tab=groups')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
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
                
                <div className="flex gap-2 flex-wrap">
                  {group.is_member ? (
                    <>
                      {isAdmin && group.privacy !== 'public' && (
                        <InviteMembersDialog groupId={group.id} groupName={group.name} />
                      )}
                      {isAdmin && (
                        <GroupSettingsDialog 
                          group={group} 
                          trigger={
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </Button>
                          }
                        />
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
                  
                  {/* Delete group - show for creator OR site admin regardless of membership */}
                  {canDeleteGroup && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? This action cannot be undone. 
                            All posts, events, polls, and members will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteGroup.mutate(group.id, {
                                onSuccess: () => navigate('/community?tab=groups'),
                              });
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              
              {/* Pinned Audio */}
              {group.is_member && pinnedAudio && pinnedAudio.length > 0 && (
                <div className="mt-4">
                  <PinnedAudioPlayer audio={pinnedAudio[0]} />
                </div>
              )}
              
              {/* Group Rules */}
              {group.is_member && group.rules && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Group Rules</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.rules}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Group Content */}
          {group.is_member ? (
            <div className="flex gap-6">
              {/* Channels Sidebar - Always show for admins or when channels exist */}
              {(isAdmin || (channels && channels.length > 0)) && (
                <div className="w-64 shrink-0 hidden lg:block">
                  <ChannelList
                    groupId={group.id}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={setSelectedChannelId}
                    isAdmin={isAdmin}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <Tabs defaultValue="posts" className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <TabsList>
                      <TabsTrigger value="posts">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Posts
                      </TabsTrigger>
                      <TabsTrigger value="members">
                        <Users className="h-4 w-4 mr-2" />
                        Members
                      </TabsTrigger>
                      {settings.allow_events !== false && (
                        <TabsTrigger value="events">
                          <Calendar className="h-4 w-4 mr-2" />
                          Events
                        </TabsTrigger>
                      )}
                      {settings.allow_polls !== false && (
                        <TabsTrigger value="polls">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Polls
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="feedback">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Feedback
                      </TabsTrigger>
                    </TabsList>
                    
                    {isAdmin && (
                      <div className="flex gap-2 flex-wrap">
                        {settings.allow_audio !== false && (
                          <PinAudioDialog groupId={group.id} />
                        )}
                        {settings.allow_events !== false && (
                          <CreateEventDialog groupId={group.id} />
                        )}
                        {settings.allow_polls !== false && (
                          <CreatePollDialog groupId={group.id} channelId={selectedChannelId} />
                        )}
                        <CreateQuestionnaireDialog groupId={group.id} channelId={selectedChannelId} />
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile Channel Selector - Always show for admins or when channels exist */}
                  {(isAdmin || (channels && channels.length > 0)) && (
                    <div className="lg:hidden">
                      <ChannelList
                        groupId={group.id}
                        selectedChannelId={selectedChannelId}
                        onSelectChannel={setSelectedChannelId}
                        isAdmin={isAdmin}
                      />
                    </div>
                  )}
                  
                  <TabsContent value="posts" className="space-y-4">
                    {/* Create Post */}
                    {canPost && groupId && (
                      <CreateGroupPost 
                        groupId={groupId} 
                        channelId={selectedChannelId}
                        allowImages={settings.allow_images !== false}
                        allowAudio={settings.allow_audio !== false}
                      />
                    )}
                    
                    {!canPost && group.is_member && (
                      <Card>
                        <CardContent className="py-6 text-center text-muted-foreground">
                          Only {settings.who_can_post === 'admins_only' ? 'admins' : 'admins and moderators'} can post in this group
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Pinned Polls */}
                    {polls?.filter(p => p.is_pinned).map((poll) => (
                      <PollCard key={`poll-${poll.id}`} poll={poll} isAdmin={isAdmin} groupId={group.id} 
                        onVote={handleVote} onPin={(id, pinned) => updatePoll.mutate({ pollId: id, groupId: group.id, updates: { is_pinned: pinned } })}
                        onDelete={(id) => deletePoll.mutate({ pollId: id, groupId: group.id })} />
                    ))}
                    
                    {/* Pinned Questionnaires */}
                    {questionnaires?.filter(q => q.is_pinned).map((q) => (
                      <QuestionnaireCard key={`quest-${q.id}`} questionnaire={q} isAdmin={isAdmin} groupId={group.id}
                        onEdit={() => setEditingQuestionnaire(q)}
                        onPin={(id, pinned) => updateQuestionnaire.mutate({ questionnaireId: id, groupId: group.id, updates: { is_pinned: pinned } })}
                        onDelete={(id) => deleteQuestionnaire.mutate({ questionnaireId: id, groupId: group.id })} />
                    ))}
                    
                    {/* Posts List */}
                    {posts?.map((post) => (
                      <GroupPostCard 
                        key={post.id} 
                        post={post} 
                        getInitials={getInitials}
                      />
                    ))}
                    
                    {/* Non-pinned Polls in feed */}
                    {polls?.filter(p => !p.is_pinned).map((poll) => (
                      <PollCard key={`poll-${poll.id}`} poll={poll} isAdmin={isAdmin} groupId={group.id}
                        onVote={handleVote} onPin={(id, pinned) => updatePoll.mutate({ pollId: id, groupId: group.id, updates: { is_pinned: pinned } })}
                        onDelete={(id) => deletePoll.mutate({ pollId: id, groupId: group.id })} />
                    ))}
                    
                    {/* Non-pinned Questionnaires in feed */}
                    {questionnaires?.filter(q => !q.is_pinned).map((q) => (
                      <QuestionnaireCard key={`quest-${q.id}`} questionnaire={q} isAdmin={isAdmin} groupId={group.id}
                        onEdit={() => setEditingQuestionnaire(q)}
                        onPin={(id, pinned) => updateQuestionnaire.mutate({ questionnaireId: id, groupId: group.id, updates: { is_pinned: pinned } })}
                        onDelete={(id) => deleteQuestionnaire.mutate({ questionnaireId: id, groupId: group.id })} />
                    ))}
                    
                    {posts?.length === 0 && polls?.length === 0 && questionnaires?.length === 0 && (
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
              
              {settings.allow_events !== false && (
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{event.title}</h4>
                              {event.event_type && (
                                <Badge variant="outline" className="text-xs">{event.event_type.replace('_', ' ')}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.start_time), 'EEEE, h:mm a')}
                              {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
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
                        <p className="text-muted-foreground mb-4">
                          {isAdmin ? 'Create an event for your group members' : 'Events will appear here when created'}
                        </p>
                        {isAdmin && <CreateEventDialog groupId={group.id} />}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
              
              {settings.allow_polls !== false && (
                <TabsContent value="polls" className="space-y-4">
                  {polls?.map((poll) => {
                    const totalVotes = poll.votes?.reduce((sum, v) => sum + v.count, 0) || 0;
                    
                    return (
                      <Card key={poll.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{poll.question}</CardTitle>
                          {poll.is_multiple_choice && (
                            <p className="text-sm text-muted-foreground">Select multiple options</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {poll.options.map((option, index) => {
                              const voteCount = poll.votes?.find(v => v.option_index === index)?.count || 0;
                              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                              const hasVotedThisOption = poll.user_votes?.includes(index);
                              const hasVotedAny = (poll.user_votes?.length || 0) > 0;
                              // For single-choice polls: can vote if not voted, or click own vote to remove
                              // For multi-choice polls: can always click any option
                              const canClick = poll.is_multiple_choice || !hasVotedAny || hasVotedThisOption;
                              
                              return (
                                <button 
                                  key={index}
                                  onClick={() => handleVote(poll.id, index)}
                                  disabled={!canClick || voteOnPoll.isPending}
                                  className={`relative w-full p-3 rounded-lg border text-left transition-colors ${
                                    hasVotedThisOption ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                  } ${canClick ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                                >
                                  <div 
                                    className="absolute inset-0 bg-primary/10 rounded-lg transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <div className="relative flex justify-between">
                                    <span>{option}</span>
                                    <span className="text-sm text-muted-foreground">{percentage}% ({voteCount})</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                            {poll.ends_at && ` • Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {polls?.length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No polls yet</h3>
                        <p className="text-muted-foreground mb-4">
                          {isAdmin ? 'Create a poll to gather opinions' : 'Polls will appear here when created'}
                        </p>
                        {isAdmin && <CreatePollDialog groupId={group.id} />}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
              
              {/* Feedback Tab */}
              <TabsContent value="feedback" className="space-y-4">
                {questionnaires?.map((q) => (
                  <Card key={q.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{q.title}</CardTitle>
                        <Badge variant={q.is_active ? 'default' : 'secondary'}>
                          {q.is_active ? 'Active' : 'Closed'}
                        </Badge>
                      </div>
                      {q.description && (
                        <p className="text-sm text-muted-foreground">{q.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {q.response_count || 0} responses • {q.questions.length} questions
                        </p>
                        <Button 
                          variant={q.user_has_responded ? 'outline' : 'default'}
                          size="sm"
                          disabled={!q.is_active || (q.user_has_responded && !q.allow_multiple_responses)}
                        >
                          {q.user_has_responded ? 'View Response' : 'Take Survey'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {questionnaires?.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No feedback forms yet</h3>
                      <p className="text-muted-foreground">
                        {isAdmin ? 'Create a questionnaire to gather feedback' : 'Feedback forms will appear here when created'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
              </div>
            </div>
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
