import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage, useDeleteConversation, Message } from '@/hooks/useMessaging';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { MessageOptionsMenu } from './MessageOptionsMenu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { X, ChevronUp, ChevronDown, Send, Paperclip, Image, Video, FileText, Maximize2, MoreVertical, User, Flag, Ban, Trash2 } from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function useBottomObstacleInsetPx() {
  const [insetPx, setInsetPx] = useState(0);

  const measure = useCallback(() => {
    if (typeof window === 'undefined' || !document?.body) return;

    const obstacles = Array.from(
      document.querySelectorAll<HTMLElement>('[data-chat-popup-obstacle="bottom"]')
    );

    let max = 0;
    for (const el of obstacles) {
      const rect = el.getBoundingClientRect();
      if (!rect.height) continue;
      const offset = window.innerHeight - rect.top;
      if (offset > max) max = offset;
    }

    setInsetPx(Math.max(0, Math.round(max)));
  }, []);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // Initial measure
    schedule();

    // Re-measure on resize
    window.addEventListener('resize', schedule);

    // Re-measure on scroll (for sticky elements entering/leaving)
    window.addEventListener('scroll', schedule, { passive: true });

    // Watch for DOM changes
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-chat-popup-obstacle'],
    });

    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  return insetPx;
}

export function ChatPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { popupConversation, closePopupChat, minimizePopupChat, isMinimized } = useMessagingPopup();
  const { data: messages, isLoading } = useMessages(popupConversation?.id || '');
  const sendMessage = useSendMessage();
  const { uploadFile, isUploading } = useR2Upload();
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; url: string; type: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomInsetPx = useBottomObstacleInsetPx();
  const popupBottomPx = bottomInsetPx;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const deleteConversation = useDeleteConversation();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('too_negative');
  const [reportDetails, setReportDetails] = useState('');

  if (!user || !popupConversation) return null;

  const handleViewInMessages = () => {
    navigate('/messages', { state: { conversationId: popupConversation.id } });
    closePopupChat();
  };

  const handleViewProfile = () => {
    if (popupConversation.participantId) {
      navigate(`/profile/${popupConversation.participantId}`);
      closePopupChat();
    }
  };

  const handleReport = () => {
    if (popupConversation.participantId) {
      createReport.mutate({
        reportType: 'user',
        reason: reportReason,
        reportedUserId: popupConversation.participantId,
        details: reportDetails || undefined,
      });
    }
    setShowReportDialog(false);
    setReportReason('too_negative');
    setReportDetails('');
  };

  const handleBlock = () => {
    if (popupConversation.participantId) {
      blockUser.mutate(popupConversation.participantId);
    }
    setShowBlockAlert(false);
    closePopupChat();
  };

  const handleDeleteConversation = () => {
    deleteConversation.mutate(popupConversation.id);
    setShowDeleteAlert(false);
    closePopupChat();
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !attachment) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (attachment) {
      try {
        const result = await uploadFile(attachment.file, {
          bucket: 'user',
          folder: 'messages',
          trackInDatabase: false,
        });
        if (result) {
          mediaUrl = result.url;
          mediaType = attachment.type;
        }
      } catch (error) {
        toast.error('Failed to upload attachment');
        return;
      }
    }

    sendMessage.mutate({
      conversationId: popupConversation.id,
      content: newMessage.trim() || (attachment ? `[${attachment.type}]` : ''),
      messageType: mediaUrl ? 'media' : 'text',
      metadata: mediaUrl ? { mediaUrl, mediaType } : {},
    });
    setNewMessage('');
    setAttachment(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const type = isImage ? 'image' : isVideo ? 'video' : 'file';

    setAttachment({
      file,
      url: URL.createObjectURL(file),
      type,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = () => {
    if (attachment) {
      URL.revokeObjectURL(attachment.url);
      setAttachment(null);
    }
  };

  const initials = popupConversation.participantName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div
      className={cn(
        "fixed right-6 w-80 bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl z-50 flex flex-col",
        isMinimized ? "h-12" : "h-[450px]"
      )}
      style={{ 
        bottom: `calc(${popupBottomPx}px + env(safe-area-inset-bottom))`,
        transition: 'bottom 300ms ease-out, height 200ms ease-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#111111] rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 ring-2 ring-neutral-700">
            <AvatarImage src={popupConversation.participantAvatar} />
            <AvatarFallback className="text-xs bg-neutral-800 text-white">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm truncate max-w-[160px] text-white">
            {popupConversation.participantName}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-neutral-800 w-48">
              <DropdownMenuItem 
                onClick={handleViewProfile}
                className="text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem 
                onClick={() => setShowReportDialog(true)}
                className="text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowBlockAlert(true)}
                className="text-red-500 hover:bg-neutral-800 focus:bg-neutral-800 hover:text-red-500 focus:text-red-500 cursor-pointer"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem 
                onClick={() => setShowDeleteAlert(true)}
                className="text-red-500 hover:bg-neutral-800 focus:bg-neutral-800 hover:text-red-500 focus:text-red-500 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-neutral-800 text-neutral-400 hover:text-white"
            onClick={handleViewInMessages}
            title="View in Messages"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-neutral-800 text-neutral-400 hover:text-white"
            onClick={minimizePopupChat}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-neutral-800 text-neutral-400 hover:text-white"
            onClick={closePopupChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Messages with scroll */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3 min-h-0 bg-[#0a0a0a]"
          >
            {isLoading ? (
              <div className="text-center text-neutral-500 text-sm py-4">Loading...</div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-neutral-500 text-sm py-4">
                No messages yet. Say hello!
              </div>
            ) : (
              <div className="space-y-2">
                {messages?.map((msg) => (
                  <PopupMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.id}
                    conversationId={popupConversation.id}
                    otherUserId={popupConversation.participantId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Attachment Preview */}
          {attachment && (
            <div className="px-2 pb-1 shrink-0 bg-[#0a0a0a]">
              <div className="relative inline-block">
                {attachment.type === 'image' ? (
                  <img src={attachment.url} alt="Preview" className="h-12 rounded object-cover" />
                ) : (
                  <div className="h-10 px-2 bg-neutral-800 rounded flex items-center gap-1 text-xs text-white">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{attachment.file.name}</span>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 hover:bg-red-700"
                  onClick={removeAttachment}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t border-neutral-800 shrink-0 bg-[#111111] rounded-b-xl">
            <div className="flex gap-1 items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:bg-neutral-800 text-neutral-400 hover:text-white">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-neutral-800">
                  <DropdownMenuItem
                    className="text-white hover:bg-neutral-800 focus:bg-neutral-800"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Image
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white hover:bg-neutral-800 focus:bg-neutral-800"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'video/*';
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white hover:bg-neutral-800 focus:bg-neutral-800"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="text-sm min-h-[36px] max-h-28 resize-none flex-1 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-red-500 focus:ring-red-500/20"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSend}
                disabled={(!newMessage.trim() && !attachment) || sendMessage.isPending || isUploading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This conversation will be removed from your inbox. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#0a0a0a] border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">Report User</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Help us understand what's wrong. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={`popup-${reason.value}`} className="border-neutral-600 text-white" />
                  <Label htmlFor={`popup-${reason.value}`} className="text-white">{reason.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</Button>
            <Button onClick={handleReport} disabled={createReport.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Alert */}
      <AlertDialog open={showBlockAlert} onOpenChange={setShowBlockAlert}>
        <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Block User?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              They won't be able to message you or see your posts. You can unblock them later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-red-600 text-white hover:bg-red-700">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PopupMessageBubble({ 
  message, 
  isOwn, 
  conversationId,
  otherUserId
}: { 
  message: Message; 
  isOwn: boolean; 
  conversationId: string;
  otherUserId?: string;
}) {
  const isMedia = message.message_type === 'media';
  const mediaUrl = message.metadata?.mediaUrl;
  const mediaType = message.metadata?.mediaType;

  return (
    <div className={cn('flex min-w-0 group', isOwn ? 'justify-end' : 'justify-start')}>
      <div className="flex items-center gap-1 max-w-[85%]">
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm',
            'break-words overflow-hidden',
            '[word-break:break-word] [overflow-wrap:anywhere]',
            isOwn 
              ? 'bg-red-600 text-white rounded-br-md' 
              : 'bg-neutral-800 text-white rounded-bl-md'
          )}
        >
          {isMedia && mediaUrl && (
            <div className="mb-1">
              {mediaType === 'image' ? (
                <img src={mediaUrl} alt="Shared image" className="max-w-full rounded" />
              ) : mediaType === 'video' ? (
                <video src={mediaUrl} controls className="max-w-full rounded" />
              ) : (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 underline text-xs break-words text-white"
                >
                  <FileText className="h-3 w-3" />
                  Attachment
                </a>
              )}
            </div>
          )}
          {message.content && !message.content.startsWith('[') && (
            <p className="whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]">{message.content}</p>
          )}
        </div>
        
        <MessageOptionsMenu
          message={message}
          conversationId={conversationId}
          otherUserId={otherUserId}
          align={isOwn ? 'end' : 'start'}
          className="h-5 w-5 text-neutral-500 hover:text-white"
        />
      </div>
    </div>
  );
}
