import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Globe, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Post, useAppreciate, useDeletePost, useComments, useCreateComment } from '@/hooks/useSocial';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const { data: comments } = useComments(showComments ? post.id : '');
  const appreciateMutation = useAppreciate();
  const deleteMutation = useDeletePost();
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.profiles?.full_name || 'Unknown'}</p>
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
          <img
            src={post.image_url}
            alt=""
            className="mt-3 rounded-lg max-h-96 w-full object-cover"
          />
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
  );
}

function CommentItem({ comment }: { comment: any }) {
  const appreciateMutation = useAppreciate();
  
  const initials = comment.profiles?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="bg-accent/30 rounded-lg px-3 py-2">
          <p className="font-medium text-sm">{comment.profiles?.full_name || 'Unknown'}</p>
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
      </div>
    </div>
  );
}
