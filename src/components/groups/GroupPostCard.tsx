import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Pin, PinOff, Megaphone, ChevronDown, ChevronUp, Send, MoreHorizontal, Pencil, Trash2, X, Check, Flag, Ban } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import type { GroupPost, GroupPostComment } from '@/types/groups';
import { useGroupPostComments, useCreateGroupPostComment, useDeleteGroupPost, useUpdateGroupPost, useDeleteGroupPostComment, useUpdateGroupPostComment } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { UserHoverCard } from '@/components/social/UserHoverCard';
import { MentionInput, renderMentionText } from '@/components/ui/mention-input';

interface GroupPostCardProps {
  post: GroupPost;
  getInitials: (name: string | null | undefined) => string;
  isAdmin?: boolean;
  canPin?: boolean;
  onPin?: (postId: string, pinned: boolean) => void;
}

export function GroupPostCard({ post, getInitials, isAdmin, canPin = true, onPin }: GroupPostCardProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedPostContent, setEditedPostContent] = useState(post.content);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  
  const { data: comments, isLoading: loadingComments } = useGroupPostComments(isOpen ? post.id : '');
  const createComment = useCreateGroupPostComment();
  const deletePost = useDeleteGroupPost();
  const updatePost = useUpdateGroupPost();
  const reportMutation = useCreateReport();
  const blockMutation = useBlockUser();
  
  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isAdmin;
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await createComment.mutateAsync({ postId: post.id, content: newComment });
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleDeletePost = () => {
    deletePost.mutate({ postId: post.id, groupId: post.group_id });
  };

  const handleUpdatePost = () => {
    if (!editedPostContent.trim()) return;
    updatePost.mutate({ postId: post.id, groupId: post.group_id, content: editedPostContent });
    setIsEditingPost(false);
  };

  const handleReport = () => {
    if (!reportReason) return;
    reportMutation.mutate({
      reportType: 'post',
      reason: reportReason,
      reportedUserId: post.user_id,
      details: reportDetails || undefined,
    }, {
      onSuccess: () => {
        setShowReportDialog(false);
        setReportReason('');
        setReportDetails('');
      }
    });
  };
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <UserHoverCard
            userId={post.user_id}
            userName={post.profile?.full_name || null}
            avatarUrl={post.profile?.avatar_url || null}
          >
            <Avatar>
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(post.profile?.full_name)}</AvatarFallback>
            </Avatar>
          </UserHoverCard>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserHoverCard
                  userId={post.user_id}
                  userName={post.profile?.full_name || null}
                  avatarUrl={post.profile?.avatar_url || null}
                >
                  <span className="font-semibold hover:underline">
                    {post.profile?.full_name || 'Anonymous'}
                  </span>
                </UserHoverCard>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
                {post.is_pinned && <Badge className="text-xs bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                {post.is_announcement && <Megaphone className="h-3 w-3 text-orange-500" />}
              </div>
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAdmin && onPin && (canPin || post.is_pinned) && (
                      <DropdownMenuItem onClick={() => onPin(post.id, !post.is_pinned)} disabled={!canPin && !post.is_pinned}>
                        {post.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                        {post.is_pinned ? 'Unpin' : 'Pin to top'}
                      </DropdownMenuItem>
                    )}
                    {isOwner && (
                      <DropdownMenuItem onClick={() => setIsEditingPost(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit post
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete post {isAdmin && !isOwner && '(Admin)'}
                      </DropdownMenuItem>
                    )}
                    {!isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                          <Flag className="h-4 w-4 mr-2" />
                          Report post
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => blockMutation.mutate(post.user_id)}
                          className="text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Block user
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditingPost ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editedPostContent}
                  onChange={(e) => setEditedPostContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdatePost} disabled={updatePost.isPending}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsEditingPost(false);
                    setEditedPostContent(post.content);
                  }}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap">{renderMentionText(post.content)}</p>
            )}
            
            {post.media_url && (
              <div className="mt-3">
                {post.media_type === 'image' && (
                  <a href={post.media_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={post.media_url} 
                      alt="" 
                      className="rounded-lg max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    />
                  </a>
                )}
                {post.media_type === 'audio' && (
                  <audio src={post.media_url} controls className="w-full" />
                )}
                {post.media_type === 'video' && (
                  <video src={post.media_url} controls className="w-full rounded-lg max-h-96" />
                )}
              </div>
            )}
            
            {/* Comments Section */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 mt-3 text-sm text-muted-foreground hover:text-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {post.comment_count || 0} {post.comment_count === 1 ? 'comment' : 'comments'}
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Comments List */}
                {loadingComments ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : (
                  <>
                    {comments?.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} getInitials={getInitials} groupId={post.group_id} />
                    ))}
                    {comments?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    )}
                  </>
                )}
                
                {/* Add Comment */}
                <div className="flex gap-2 pt-2 border-t">
                  <MentionInput
                    placeholder="Write a comment... Use @ to mention"
                    value={newComment}
                    onChange={setNewComment}
                    rows={2}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createComment.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={!reportReason || reportMutation.isPending}>
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CommentItem({ comment, getInitials, groupId }: { comment: GroupPostComment; getInitials: (name: string | null | undefined) => string; groupId: string }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  
  const deleteComment = useDeleteGroupPostComment();
  const updateComment = useUpdateGroupPostComment();
  
  const isOwner = user?.id === comment.user_id;
  const daysSinceCreation = differenceInDays(new Date(), new Date(comment.created_at));
  const canEdit = isOwner && daysSinceCreation <= 30;
  
  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id, postId: comment.post_id });
  };

  const handleUpdate = () => {
    if (!editedContent.trim()) return;
    updateComment.mutate({ commentId: comment.id, postId: comment.post_id, content: editedContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUpdate();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedContent(comment.content);
    }
  };
  
  return (
    <div className="flex items-start gap-2 pl-4 border-l-2 border-muted">
      <Link to={`/profile/${comment.user_id}`}>
        <Avatar className="h-7 w-7">
          <AvatarImage src={comment.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{getInitials(comment.profile?.full_name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${comment.user_id}`} className="text-sm font-semibold hover:underline">
              {comment.profile?.full_name || 'Anonymous'}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit ? (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit comment
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit (expired)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete comment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleUpdate} disabled={updateComment.isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                setIsEditing(false);
                setEditedContent(comment.content);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-1">{renderMentionText(comment.content)}</p>
        )}
      </div>
    </div>
  );
}
