import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, Pin, Megaphone, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GroupPost, GroupPostComment } from '@/types/groups';
import { useGroupPostComments, useCreateGroupPostComment } from '@/hooks/useGroups';

interface GroupPostCardProps {
  post: GroupPost;
  getInitials: (name: string | null | undefined) => string;
}

export function GroupPostCard({ post, getInitials }: GroupPostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const { data: comments, isLoading: loadingComments } = useGroupPostComments(isOpen ? post.id : '');
  const createComment = useCreateGroupPostComment();
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await createComment.mutateAsync({ postId: post.id, content: newComment });
    setNewComment('');
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
            <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
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
                      <CommentItem key={comment.id} comment={comment} getInitials={getInitials} />
                    ))}
                    {comments?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    )}
                  </>
                )}
                
                {/* Add Comment */}
                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
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

function CommentItem({ comment, getInitials }: { comment: GroupPostComment; getInitials: (name: string | null | undefined) => string }) {
  return (
    <div className="flex items-start gap-2 pl-4 border-l-2 border-muted">
      <Link to={`/profile/${comment.user_id}`}>
        <Avatar className="h-7 w-7">
          <AvatarImage src={comment.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{getInitials(comment.profile?.full_name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${comment.user_id}`} className="text-sm font-semibold hover:underline">
            {comment.profile?.full_name || 'Anonymous'}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
      </div>
    </div>
  );
}
