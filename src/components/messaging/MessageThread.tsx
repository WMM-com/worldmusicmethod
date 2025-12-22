import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, User, Calendar, Clock, MoreVertical, Paperclip, Image, Video, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversationId: string;
  participantName?: string;
}

interface AttachmentPreview {
  file: File;
  url: string;
  type: 'image' | 'video' | 'file';
}

export function MessageThread({ conversationId, participantName }: MessageThreadProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const { uploadFile, isUploading } = useR2Upload();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const handleSend = async () => {
    if (!content.trim() && !attachment) return;

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

    await sendMessage.mutateAsync({
      conversationId,
      content: content.trim() || (attachment ? `[${attachment.type}]` : ''),
      messageType: mediaUrl ? 'media' : 'text',
      metadata: mediaUrl ? { mediaUrl, mediaType } : {},
    });
    
    setContent('');
    setAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const sendAvailabilityMessage = (slots: string[]) => {
    const message = `I'm available at the following times:\n${slots.join('\n')}\n\nLet me know which works for you.`;
    sendMessage.mutate({
      conversationId,
      content: message,
      messageType: 'availability',
      metadata: { slots },
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="border-b border-border pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{participantName || 'Conversation'}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => sendAvailabilityMessage([
                'Monday 10:00 AM - 12:00 PM',
                'Wednesday 2:00 PM - 4:00 PM',
                'Friday 11:00 AM - 1:00 PM',
              ])}>
                <Calendar className="h-4 w-4 mr-2" />
                Send Availability
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Messages area with fixed height and scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        <div className="space-y-4">
          {messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
            />
          ))}
          {messages?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation.
            </p>
          )}
        </div>
      </div>

      {/* Attachment Preview */}
      {attachment && (
        <div className="px-4 pb-2 shrink-0">
          <div className="relative inline-block">
            {attachment.type === 'image' ? (
              <img src={attachment.url} alt="Preview" className="h-20 rounded-lg object-cover" />
            ) : attachment.type === 'video' ? (
              <video src={attachment.url} className="h-20 rounded-lg" />
            ) : (
              <div className="h-20 px-4 bg-muted rounded-lg flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-sm truncate max-w-[150px]">{attachment.file.name}</span>
              </div>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={removeAttachment}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
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
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
                  fileInputRef.current.click();
                }
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!content.trim() && !attachment) || sendMessage.isPending || isUploading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const isAvailability = message.message_type === 'availability';
  const isMedia = message.message_type === 'media';
  const mediaUrl = message.metadata?.mediaUrl;
  const mediaType = message.metadata?.mediaType;

  return (
    <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.sender_profile?.avatar_url || undefined} />
        <AvatarFallback>
          <User className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
          isAvailability && 'border-l-4 border-secondary'
        )}
      >
        {isAvailability && (
          <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
            <Clock className="h-3 w-3" />
            <span>Availability</span>
          </div>
        )}
        
        {isMedia && mediaUrl && (
          <div className="mb-2">
            {mediaType === 'image' ? (
              <img src={mediaUrl} alt="Shared" className="max-w-full rounded-lg" />
            ) : mediaType === 'video' ? (
              <video src={mediaUrl} controls className="max-w-full rounded-lg" />
            ) : (
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline"
              >
                <FileText className="h-4 w-4" />
                View attachment
              </a>
            )}
          </div>
        )}
        
        {message.content && message.content !== '[image]' && message.content !== '[video]' && message.content !== '[file]' && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        <span className={cn(
          'text-xs block mt-1',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
    </div>
  );
}
