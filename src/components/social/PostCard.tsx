import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Globe, Users, Pencil, Megaphone, RefreshCw, Star, Music2, Reply, ChevronDown, Paperclip, Image, Video, X, FileText, Flag, Ban } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Comment, useAppreciate, useDeletePost, useUpdatePost, useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useSocial';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { useR2Upload } from '@/hooks/useR2Upload';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UserHoverCard } from './UserHoverCard';
import { MentionInput, renderMentionText } from '@/components/ui/mention-input';

// Global video manager to ensure only one video plays at a time
const videoRegistry = new Set<HTMLVideoElement>();

function registerVideo(video: HTMLVideoElement) {
  videoRegistry.add(video);
}

function unregisterVideo(video: HTMLVideoElement) {
  videoRegistry.delete(video);
}

function pauseAllExcept(currentVideo: HTMLVideoElement) {
  videoRegistry.forEach((video) => {
    if (video !== currentVideo && !video.paused) {
      video.pause();
    }
  });
  // Also pause the global audio player
  window.dispatchEvent(new CustomEvent('pause-audio-player'));
}

function pauseAllVideos() {
  videoRegistry.forEach((video) => {
    if (!video.paused) {
      video.pause();
    }
  });
}

// Listen for pause-all-videos event (fired when audio player resumes)
if (typeof window !== 'undefined') {
  window.addEventListener('pause-all-videos', pauseAllVideos);
}

// Facebook-style video player that adapts to video dimensions
function VideoPlayer({ src }: { src: string }) {
  const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait' | 'landscape'>('landscape');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      registerVideo(video);
      return () => unregisterVideo(video);
    }
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const { videoWidth, videoHeight } = video;
    const ratio = videoWidth / videoHeight;
    
    if (Math.abs(ratio - 1) < 0.1) {
      // Square (ratio ~1:1)
      setAspectRatio('square');
    } else if (ratio < 0.8) {
      // Portrait (taller than wide, like 9:16)
      setAspectRatio('portrait');
    } else {
      // Landscape (wider than tall)
      setAspectRatio('landscape');
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      pauseAllExcept(videoRef.current);
    }
  };

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden mx-auto",
        aspectRatio === 'square' && "aspect-square max-w-[500px]",
        aspectRatio === 'portrait' && "aspect-[4/5] max-h-[500px] max-w-[400px] bg-black",
        aspectRatio === 'landscape' && "aspect-video"
      )}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        className={cn(
          "absolute inset-0 w-full h-full",
          aspectRatio === 'portrait' ? "object-contain" : "object-cover"
        )}
      />
    </div>
  );
}

interface PostCardProps {
  post: Post;
  defaultShowComments?: boolean;
}

const COMMENT_EDIT_DAYS_LIMIT = 30;
const INITIAL_COMMENTS_SHOWN = 3;

const POST_TYPE_CONFIG = {
  statement: {
    label: 'Statement',
    icon: Megaphone,
    borderColor: 'border-l-brand-red',
    badgeClass: 'bg-brand-red/10 text-brand-red border-brand-red/20',
    buttonColor: 'bg-brand-red hover:bg-brand-red/90 text-white',
  },
  update: {
    label: 'Update',
    icon: RefreshCw,
    borderColor: 'border-l-brand-blue',
    badgeClass: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    buttonColor: 'bg-brand-blue hover:bg-brand-blue/90 text-white',
  },
  recommendation: {
    label: 'Recommendation',
    icon: Star,
    borderColor: 'border-l-brand-yellow',
    badgeClass: 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20',
    buttonColor: 'bg-brand-yellow hover:bg-brand-yellow/90 text-black',
  },
  practice: {
    label: 'Practice Room',
    icon: Music2,
    borderColor: 'border-l-brand-green',
    badgeClass: 'bg-brand-green/10 text-brand-green border-brand-green/20',
    buttonColor: 'bg-brand-green hover:bg-brand-green/90 text-white',
  },
};

export function PostCard({ post, defaultShowComments = false }: PostCardProps) {
  const { user, isAdmin } = useAuth();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentAttachment, setCommentAttachment] = useState<{ file: File; url: string; type: string } | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: comments } = useComments(showComments ? post.id : '');
  const appreciateMutation = useAppreciate();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();
  const createCommentMutation = useCreateComment();
  const reportMutation = useCreateReport();
  const blockMutation = useBlockUser();
  const { uploadFile, isUploading } = useR2Upload();

  // Open comments if defaultShowComments changes
  useEffect(() => {
    if (defaultShowComments) {
      setShowComments(true);
    }
  }, [defaultShowComments]);

  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isAdmin;
  const initials = post.profiles?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  // Organize comments into threads (top-level and replies)
  const topLevelComments = comments?.filter(c => !c.parent_id) || [];
  const repliesMap = new Map<string, Comment[]>();
  comments?.forEach(c => {
    if (c.parent_id) {
      const existing = repliesMap.get(c.parent_id) || [];
      repliesMap.set(c.parent_id, [...existing, c]);
    }
  });

  const visibleComments = showAllComments 
    ? topLevelComments 
    : topLevelComments.slice(0, INITIAL_COMMENTS_SHOWN);

  const handleAppreciate = () => {
    appreciateMutation.mutate({
      postId: post.id,
      remove: post.user_appreciated || false,
    });
  };

  const handleComment = async () => {
    if (!commentText.trim() && !commentAttachment) return;
    
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (commentAttachment) {
      try {
        const result = await uploadFile(commentAttachment.file, { 
          bucket: 'user', 
          folder: 'comments',
          trackInDatabase: false,
        });
        if (result) {
          mediaUrl = result.url;
          mediaType = commentAttachment.type;
        }
      } catch (error) {
        toast.error('Failed to upload attachment');
        return;
      }
    }

    createCommentMutation.mutate(
      { 
        postId: post.id, 
        content: commentText.trim() || (mediaUrl ? `[${mediaType}]` : ''),
        parentId: replyingTo || undefined,
        mediaUrl,
        mediaType,
      },
      { 
        onSuccess: () => {
          setCommentText('');
          setReplyingTo(null);
          removeCommentAttachment();
        }
      }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const type = isImage ? 'image' : isVideo ? 'video' : 'file';

    setCommentAttachment({
      file,
      url: URL.createObjectURL(file),
      type,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeCommentAttachment = () => {
    if (commentAttachment) {
      URL.revokeObjectURL(commentAttachment.url);
      setCommentAttachment(null);
    }
  };

  const displayMediaType = post.media_type || (post.image_url ? 'image' : null);
  const postType = (post.post_type as keyof typeof POST_TYPE_CONFIG) || 'update';
  const typeConfig = POST_TYPE_CONFIG[postType];
  const TypeIcon = typeConfig.icon;

  return (
    <>
      <Card id={`post-${post.id}`} className={cn("overflow-hidden border-l-4", typeConfig.borderColor)}>
        <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserHoverCard 
                userId={post.user_id} 
                userName={post.profiles?.full_name || null}
                avatarUrl={post.profiles?.avatar_url || null}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </UserHoverCard>
              <div>
                <div className="flex items-center gap-2">
                  <UserHoverCard 
                    userId={post.user_id} 
                    userName={post.profiles?.full_name || null}
                    avatarUrl={post.profiles?.avatar_url || null}
                  >
                    <p className="font-medium hover:underline">{post.profiles?.full_name || 'Unknown'}</p>
                  </UserHoverCard>
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
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <DropdownMenuItem onClick={handleEditOpen}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit post
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(post.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete post {isAdmin && !isOwner && '(Admin)'}
                    </DropdownMenuItem>
                  )}
                  {!isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                        <Flag className="h-4 w-4 mr-2" />
                        Report post
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="whitespace-pre-wrap">{renderMentionText(post.content)}</p>
{post.image_url && (
            <div className="mt-3">
              {displayMediaType === 'video' ? (
                <VideoPlayer src={post.image_url} />
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
              onClick={user ? handleAppreciate : () => window.location.href = '/auth'}
              disabled={user ? appreciateMutation.isPending : false}
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
              {visibleComments.map((comment) => (
                <CommentThread 
                  key={comment.id} 
                  comment={comment} 
                  replies={repliesMap.get(comment.id) || []}
                  onReply={user ? (commentId) => setReplyingTo(commentId) : () => window.location.href = '/auth'}
                />
              ))}
              
              {topLevelComments.length > INITIAL_COMMENTS_SHOWN && !showAllComments && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllComments(true)}
                  className="w-full"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View {topLevelComments.length - INITIAL_COMMENTS_SHOWN} more comments
                </Button>
              )}
              
              {/* Reply indicator */}
              {user && replyingTo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                  <Reply className="h-4 w-4" />
                  <span>Replying to a comment</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Attachment Preview */}
              {user && commentAttachment && (
                <div className="relative inline-block">
                  {commentAttachment.type === 'image' ? (
                    <img src={commentAttachment.url} alt="Preview" className="h-16 rounded object-cover" />
                  ) : commentAttachment.type === 'video' ? (
                    <video src={commentAttachment.url} className="h-16 rounded" />
                  ) : (
                    <div className="h-12 px-3 bg-muted rounded flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{commentAttachment.file.name}</span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5"
                    onClick={removeCommentAttachment}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* Comment input - only for logged in users */}
              {user && (
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}>
                        <Image className="h-4 w-4 mr-2" />
                        Image
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }
                      }}>
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <MentionInput
                    value={commentText}
                    onChange={setCommentText}
                    placeholder={replyingTo ? "Write a reply... Use @ to mention" : "Write a comment... Use @ to mention"}
                    rows={1}
                    className="min-h-[40px] flex-1"
                  />
                  <Button
                    onClick={handleComment}
                    disabled={(!commentText.trim() && !commentAttachment) || createCommentMutation.isPending || isUploading}
                    size="sm"
                    className={typeConfig.buttonColor}
                  >
                    Post
                  </Button>
                </div>
              )}
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
              <label className="text-sm font-medium">Reason</label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details (optional)</label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reportReason) {
                  toast.error('Please select a reason');
                  return;
                }
                reportMutation.mutate({
                  reportType: 'post',
                  reason: reportReason,
                  reportedPostId: post.id,
                  reportedUserId: post.user_id,
                  details: reportDetails || undefined,
                }, {
                  onSuccess: () => {
                    setShowReportDialog(false);
                    setReportReason('');
                    setReportDetails('');
                  }
                });
              }}
              disabled={!reportReason || reportMutation.isPending}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CommentThreadProps {
  comment: Comment;
  replies: Comment[];
  onReply: (commentId: string) => void;
}

function CommentThread({ comment, replies, onReply }: CommentThreadProps) {
  return (
    <div className="space-y-2">
      <CommentItem comment={comment} onReply={onReply} />
      {replies.length > 0 && (
        <div className="ml-10 space-y-2 border-l-2 border-border pl-3">
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string) => void;
  isReply?: boolean;
}

function CommentItem({ comment, onReply, isReply = false }: CommentItemProps) {
  const { user, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const appreciateMutation = useAppreciate();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  
  const isOwner = user?.id === comment.user_id;
  const canDelete = isOwner || isAdmin;
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

  // Check for media in comment (from extended Comment type)
  const mediaUrl = (comment as any).media_url;
  const mediaType = (comment as any).media_type;

  return (
    <div className="flex gap-2">
      <Avatar className={cn("flex-shrink-0", isReply ? "h-6 w-6" : "h-8 w-8")}>
        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
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
                {(isOwner || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner && (
                        canEdit ? (
                          <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Pencil className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled className="text-xs">
                            <Pencil className="h-3 w-3 mr-2" />
                            Edit (expired after 30 days)
                          </DropdownMenuItem>
                        )
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={handleDelete}
                          className="text-destructive"
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete {isAdmin && !isOwner && '(Admin)'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Comment Media */}
              {mediaUrl && (
                <div className="mb-2 mt-1">
                  {mediaType === 'image' ? (
                    <img src={mediaUrl} alt="Comment media" className="max-w-full max-h-48 rounded" />
                  ) : mediaType === 'video' ? (
                    <video src={mediaUrl} controls className="max-w-full max-h-48 rounded" />
                  ) : (
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline"
                    >
                      <FileText className="h-4 w-4" />
                      View attachment
                    </a>
                  )}
                </div>
              )}
              
              {comment.content && !comment.content.startsWith('[') && (
                <p className="text-sm">{comment.content}</p>
              )}
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
              {!isReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="hover:underline"
                >
                  Reply
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}