import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Globe, Users, Pencil, X, Upload, Loader2, Image, Video, Music } from 'lucide-react';
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
import { Post, useAppreciate, useDeletePost, useUpdatePost, useComments, useCreateComment } from '@/hooks/useSocial';
import { useR2Upload } from '@/hooks/useR2Upload';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
}

type MediaType = 'image' | 'video' | 'audio' | null;

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editMediaUrl, setEditMediaUrl] = useState(post.image_url);
  const [editMediaType, setEditMediaType] = useState<MediaType>(post.media_type as MediaType);
  const [showUpload, setShowUpload] = useState<MediaType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: comments } = useComments(showComments ? post.id : '');
  const appreciateMutation = useAppreciate();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();
  const createCommentMutation = useCreateComment();
  const { uploadFile, isUploading, progress } = useR2Upload();

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
    setEditMediaUrl(post.image_url);
    setEditMediaType(post.media_type as MediaType);
    setShowUpload(null);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    updateMutation.mutate(
      { 
        postId: post.id, 
        content: editContent, 
        mediaUrl: editMediaUrl, 
        mediaType: editMediaType 
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const getAcceptType = (type: MediaType) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      default: return '*/*';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !showUpload) return;

    const result = await uploadFile(file, {
      bucket: 'user',
      folder: `posts/${showUpload}`,
      imageOptimization: showUpload === 'image' ? 'feed' : undefined,
      trackInDatabase: true,
      altText: `Post ${showUpload}`,
    });

    if (result) {
      setEditMediaUrl(result.url);
      setEditMediaType(showUpload);
      setShowUpload(null);
    }
  };

  const handleRemoveMedia = () => {
    setEditMediaUrl(null);
    setEditMediaType(null);
    setShowUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = (type: MediaType) => {
    if (showUpload === type) {
      setShowUpload(null);
    } else {
      setShowUpload(type);
    }
  };

  // Determine media type from URL if not set
  const displayMediaType = post.media_type || (post.image_url ? 'image' : null);

  return (
    <>
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

      {/* Edit Dialog */}
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

            {/* Media preview */}
            {editMediaUrl && (
              <div className="relative inline-block">
                {editMediaType === 'image' && (
                  <img 
                    src={editMediaUrl} 
                    alt="Upload preview" 
                    className="max-h-48 rounded-lg object-cover"
                  />
                )}
                {editMediaType === 'video' && (
                  <video 
                    src={editMediaUrl} 
                    controls 
                    className="max-h-48 rounded-lg"
                  />
                )}
                {editMediaType === 'audio' && (
                  <audio src={editMediaUrl} controls className="w-full" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading... {progress}%
                </p>
              </div>
            )}

            {/* Upload area */}
            {showUpload && !editMediaUrl && !isUploading && (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload {showUpload === 'image' ? 'an image' : showUpload === 'video' ? 'a video' : 'audio'}
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptType(showUpload)}
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('image')}
                  className={showUpload === 'image' || editMediaType === 'image' ? 'text-primary' : ''}
                  disabled={isUploading}
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('video')}
                  className={showUpload === 'video' || editMediaType === 'video' ? 'text-primary' : ''}
                  disabled={isUploading}
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUploadClick('audio')}
                  className={showUpload === 'audio' || editMediaType === 'audio' ? 'text-primary' : ''}
                  disabled={isUploading}
                >
                  <Music className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditSave}
                  disabled={!editContent.trim() || updateMutation.isPending || isUploading}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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