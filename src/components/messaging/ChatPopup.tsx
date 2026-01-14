import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessaging';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { STICKY_PLAYER_HEIGHT } from '@/components/media/StickyAudioPlayer';
import { X, Minus, Send, Paperclip, Image, Video, FileText, Maximize2, MoreVertical, Trash2, Calendar, Flag, Ban } from 'lucide-react';
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

  const [audioPlayer, setAudioPlayer] = useState<{ visible: boolean; minimized: boolean }>({
    visible: false,
    minimized: true,
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};

      if (detail?.isVisible === false) {
        setAudioPlayer({ visible: false, minimized: true });
        return;
      }

      // If we get this event, the player exists
      setAudioPlayer({
        visible: true,
        minimized: !!detail?.isMinimized,
      });
    };

    window.addEventListener('audio-player-state', handler as EventListener);
    return () => window.removeEventListener('audio-player-state', handler as EventListener);
  }, []);

  const popupBottomPx = 24 + (audioPlayer.visible && !audioPlayer.minimized ? STICKY_PLAYER_HEIGHT : 0);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  if (!user || !popupConversation) return null;

  const handleViewInMessages = () => {
    navigate('/messages', { state: { conversationId: popupConversation.id } });
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
        "fixed right-6 w-80 bg-card border border-primary/30 rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-200",
        isMinimized ? "h-12" : "h-[450px]"
      )}
      style={{ bottom: popupBottomPx }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 ring-2 ring-primary/30">
            <AvatarImage src={popupConversation.participantAvatar} />
            <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm truncate max-w-[120px]">
            {popupConversation.participantName}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={handleViewInMessages}
            title="View in Messages"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={minimizePopupChat}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
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
            className="flex-1 overflow-y-auto p-3 min-h-0 bg-gradient-to-b from-background to-card/50"
          >
            {isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
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
            <div className="px-2 pb-1 shrink-0 bg-card">
              <div className="relative inline-block">
                {attachment.type === 'image' ? (
                  <img src={attachment.url} alt="Preview" className="h-12 rounded object-cover" />
                ) : (
                  <div className="h-10 px-2 bg-muted rounded flex items-center gap-1 text-xs">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{attachment.file.name}</span>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5"
                  onClick={removeAttachment}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t border-primary/20 shrink-0 bg-card rounded-b-xl">
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
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:bg-primary/10">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card">
                  <DropdownMenuItem
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
                className="text-sm min-h-[36px] max-h-28 resize-none flex-1 border-primary/20"
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
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={(!newMessage.trim() && !attachment) || sendMessage.isPending || isUploading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
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
  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('too_negative');
  const [reportDetails, setReportDetails] = useState('');

  const isMedia = message.message_type === 'media';
  const mediaUrl = message.metadata?.mediaUrl;
  const mediaType = message.metadata?.mediaType;

  const handleSendAvailability = () => {
    const slots = [
      'Monday 10:00 AM - 12:00 PM',
      'Wednesday 2:00 PM - 4:00 PM',
      'Friday 11:00 AM - 1:00 PM',
    ];
    sendMessage.mutate({
      conversationId,
      content: `I'm available at the following times:\n${slots.join('\n')}\n\nLet me know which works for you.`,
      messageType: 'availability',
      metadata: { slots },
    });
  };

  const handleReport = () => {
    createReport.mutate({
      reportType: 'user',
      reason: reportReason,
      reportedUserId: message.sender_id,
      details: reportDetails || undefined,
    });
    setShowReportDialog(false);
    setReportReason('too_negative');
    setReportDetails('');
  };

  const handleBlock = () => {
    if (otherUserId) {
      blockUser.mutate(otherUserId);
    }
    setShowBlockAlert(false);
  };

  return (
    <>
      <div className={cn('flex min-w-0 group', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="flex items-center gap-1 max-w-[85%]">
          <div
            className={cn(
              'px-3 py-2 rounded-2xl text-sm shadow-sm',
              'break-words overflow-hidden',
              '[word-break:break-word] [overflow-wrap:anywhere]',
              isOwn 
                ? 'bg-primary text-primary-foreground rounded-br-md' 
                : 'bg-card border border-primary/20 rounded-bl-md'
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
                    className="flex items-center gap-1 underline text-xs break-words"
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-44 bg-card">
              <DropdownMenuItem onClick={handleSendAvailability}>
                <Calendar className="h-4 w-4 mr-2" />
                Send Availability
              </DropdownMenuItem>
              
              {!isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBlockAlert(true)} className="text-destructive focus:text-destructive">
                    <Ban className="h-4 w-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={`popup-${reason.value}`} />
                  <Label htmlFor={`popup-${reason.value}`}>{reason.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={createReport.isPending}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Alert */}
      <AlertDialog open={showBlockAlert} onOpenChange={setShowBlockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message you or see your posts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
