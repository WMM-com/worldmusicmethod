import { useState } from 'react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Globe, Users, Pencil, Megaphone, RefreshCw, Star, Dumbbell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Comment, useAppreciate, useDeletePost, useUpdatePost, useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useSocial';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
}

const COMMENT_EDIT_DAYS_LIMIT = 30;


const POST_TYPE_CONFIG = {
  statement: {
    label: 'Statement',
    icon: Megaphone,
    borderColor: 'border-l-red-500',
    badgeClass: 'bg-red-500/10 text-red-600 border-red-500/20',
    buttonColor: 'bg-red-500 hover:bg-red-600 text-white',
  },
  update: {
    label: 'Update',
    icon: RefreshCw,
    borderColor: 'border-l-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    buttonColor: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  recommendation: {
    label: 'Recommendation',
    icon: Star,
    borderColor: 'border-l-yellow-500',
    badgeClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  practice: {
    label: 'Practice Room',
    icon: Dumbbell,
    borderColor: 'border-l-green-500',
    badgeClass: 'bg-green-500/10 text-green-600 border-green-500/20',
    buttonColor: 'bg-green-500 hover:bg-green-600 text-white',
  },
};

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  
  const { data: comments } = useComments(showComments ? post.id : '');
  const appreciateMutation = useAppreciate();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();
  const createCommentMutation = useCreateComment();

  const isOwner = user?.id === post.user_id;
  const initials = post.profiles?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleAppreciate = () => {
    appreciateMutation.mutate({
      postId: post.id,
      remove: post.user_appreciated || false,
    });
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate(
      { postId: post.id, content: commentText },
      { onSuccess: () => setCommentText('') }
    );
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  const handleEditOpen = () => {
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    // Only update content, keep media unchanged
    updateMutation.mutate(
      { 
        postId: post.id, 
        content: editContent, 
        mediaUrl: post.image_url, 
        mediaType: post.media_type as 'image' | 'video' | 'audio' | null
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  // Determine media type from URL if not set
  const displayMediaType = post.media_type || (post.image_url ? 'image' : null);

  const postType = (post.post_type as keyof typeof POST_TYPE_CONFIG) || 'update';
  const typeConfig = POST_TYPE_CONFIG[postType];
  const TypeIcon = typeConfig.icon;

  return (
    <>
      <Card className={cn("overflow-hidden border-l-4", typeConfig.borderColor)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{post.profiles?.full_name || 'Unknown'}</p>
                  <Badge variant="outline" className={cn("text-xs gap-1 py-0", typeConfig.badgeClass)}>
                    <TypeIcon className="h-3 w-3" />
                    {typeConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  <span>·</span>
                  {post.visibility === 'public' ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditOpen}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(post.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <div className="mt-3">
              {displayMediaType === 'video' ? (
                <video 
                  src={post.image_url} 
                  controls 
                  className="rounded-lg max-h-96 w-full object-contain bg-black"
                />
              ) : displayMediaType === 'audio' ? (
                <audio src={post.image_url} controls className="w-full mt-2" />
              ) : (
                <img
                  src={post.image_url}
                  alt=""
                  className="rounded-lg max-h-96 w-full object-cover"
                />
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 pt-0">
          {/* Stats */}
          {(post.appreciation_count > 0 || post.comment_count > 0) && (
            <div className="w-full flex items-center gap-4 text-sm text-muted-foreground pb-2 border-b">
              {post.appreciation_count > 0 && (
                <span>{post.appreciation_count} appreciation{post.appreciation_count !== 1 ? 's' : ''}</span>
              )}
              {post.comment_count > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="hover:underline"
                >
                  {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="w-full flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAppreciate}
              disabled={appreciateMutation.isPending}
              className={cn(
                'flex-1',
                post.user_appreciated && 'text-primary'
              )}
            >
              <Heart className={cn('h-4 w-4 mr-2', post.user_appreciated && 'fill-current')} />
              Appreciate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="w-full space-y-3 pt-2 border-t">
              {comments?.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Write a comment... (Enter to post)"
                  rows={1}
                  className="min-h-[40px] resize-none"
                />
                <Button
                  onClick={handleComment}
                  disabled={!commentText.trim() || createCommentMutation.isPending}
                  size="sm"
                >
                  Post
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Edit Dialog - Text only, no media changes allowed */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="resize-none"
            />

            {/* Show existing media as preview only - not editable */}
            {post.image_url && (
              <div className="rounded-lg overflow-hidden bg-muted/30 p-2">
                <p className="text-xs text-muted-foreground mb-2">Media cannot be changed after posting</p>
                {post.media_type === 'image' || !post.media_type ? (
                  <img 
                    src={post.image_url} 
                    alt="Post media" 
                    className="max-h-32 rounded object-cover opacity-75"
                  />
                ) : post.media_type === 'video' ? (
                  <video 
                    src={post.image_url} 
                    className="max-h-32 rounded opacity-75"
                  />
                ) : (
                  <audio src={post.image_url} controls className="w-full opacity-75" />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEditSave}
                disabled={!editContent.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const appreciateMutation = useAppreciate();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  
  const isOwner = user?.id === comment.user_id;
  const daysSinceCreated = differenceInDays(new Date(), new Date(comment.created_at));
  const canEdit = isOwner && daysSinceCreated <= COMMENT_EDIT_DAYS_LIMIT;
  
  const initials = comment.profiles?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateCommentMutation.mutate(
      { commentId: comment.id, content: editContent },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = () => {
    deleteCommentMutation.mutate(comment.id);
  };

  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="min-h-[60px] resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || updateCommentMutation.isPending}
              >
                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-accent/30 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{comment.profiles?.full_name || 'Unknown'}</p>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit ? (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Pencil className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled className="text-xs">
                          <Pencil className="h-3 w-3 mr-2" />
                          Edit (expired after 30 days)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive"
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
              <button
                onClick={() => appreciateMutation.mutate({
                  commentId: comment.id,
                  remove: comment.user_appreciated,
                })}
                className={cn('hover:underline', comment.user_appreciated && 'text-primary font-medium')}
              >
                Appreciate {comment.appreciation_count > 0 && `(${comment.appreciation_count})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
