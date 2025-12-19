import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Pin, Megaphone, ChevronDown, ChevronUp, Send, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import type { GroupPost, GroupPostComment } from '@/types/groups';
import { useGroupPostComments, useCreateGroupPostComment, useDeleteGroupPost, useUpdateGroupPost, useDeleteGroupPostComment, useUpdateGroupPostComment } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';

interface GroupPostCardProps {
  post: GroupPost;
  getInitials: (name: string | null | undefined) => string;
}

export function GroupPostCard({ post, getInitials }: GroupPostCardProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedPostContent, setEditedPostContent] = useState(post.content);
  
  const { data: comments, isLoading: loadingComments } = useGroupPostComments(isOpen ? post.id : '');
  const createComment = useCreateGroupPostComment();
  const deletePost = useDeleteGroupPost();
  const updatePost = useUpdateGroupPost();
  
  const isOwner = user?.id === post.user_id;
  
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
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${post.user_id}`}>
            <Avatar>
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(post.profile?.full_name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${post.user_id}`} className="font-semibold hover:underline">
                  {post.profile?.full_name || 'Anonymous'}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
                {post.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                {post.is_announcement && <Megaphone className="h-3 w-3 text-orange-500" />}
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditingPost(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
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
              <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
            )}
            
            {post.media_url && (
              <div className="mt-3">
                {post.media_type === 'image' && (
                  <img src={post.media_url} alt="" className="rounded-lg max-h-96 object-cover" />
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
                  <Textarea
                    placeholder="Write a comment... (Enter to post)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyDown}
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
          <p className="text-sm mt-1">{comment.content}</p>
        )}
      </div>
    </div>
  );
}
