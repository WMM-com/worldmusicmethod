import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { MessageOptionsMenu } from './MessageOptionsMenu';
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
import { Send, User, Paperclip, Image, Video, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversationId: string;
  participantName?: string;
  participantId?: string;
  participantUsername?: string;
}

interface AttachmentPreview {
  file: File;
  url: string;
  type: 'image' | 'video' | 'file';
}

export function MessageThread({ conversationId, participantName, participantId, participantUsername }: MessageThreadProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const { uploadFile, isUploading } = useR2Upload();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col overflow-hidden border-neutral-800 bg-[#0a0a0a]">
        <CardHeader className="bg-[#111111]">
          <Skeleton className="h-6 w-32 bg-neutral-800" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-full bg-neutral-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden border-neutral-800 bg-[#0a0a0a]">
      <CardHeader className="border-b border-neutral-800 pb-4 shrink-0 bg-[#111111]">
        <CardTitle 
          className="text-lg leading-tight break-words whitespace-normal text-white cursor-pointer hover:text-red-400 transition-colors"
          onClick={() => participantId && navigate(`/${participantUsername || participantId}`)}
        >
          {participantName || 'Conversation'}
        </CardTitle>
      </CardHeader>

      {/* Messages area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 min-h-0 bg-[#0a0a0a]"
      >
        <div className="space-y-4">
          {messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              conversationId={conversationId}
              otherUserId={participantId}
            />
          ))}
          {messages?.length === 0 && (
            <p className="text-center text-neutral-500 py-8">
              No messages yet. Start the conversation.
            </p>
          )}
        </div>
      </div>

      {/* Attachment Preview */}
      {attachment && (
        <div className="px-4 pb-2 shrink-0 bg-[#0a0a0a]">
          <div className="relative inline-block">
            {attachment.type === 'image' ? (
              <img src={attachment.url} alt="Preview" className="h-20 rounded-lg object-cover" />
            ) : attachment.type === 'video' ? (
              <video src={attachment.url} className="h-20 rounded-lg" />
            ) : (
              <div className="h-20 px-4 bg-neutral-800 rounded-lg flex items-center gap-2">
                <FileText className="h-6 w-6 text-white" />
                <span className="text-sm truncate max-w-[150px] text-white">{attachment.file.name}</span>
              </div>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 hover:bg-red-700"
              onClick={removeAttachment}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-neutral-800 shrink-0 bg-[#111111]">
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
              <Button variant="ghost" size="icon" className="shrink-0 hover:bg-neutral-800 text-neutral-400 hover:text-white">
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none flex-1 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-red-500 focus:ring-red-500/20"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!content.trim() && !attachment) || sendMessage.isPending || isUploading}
            size="icon"
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MessageBubble({ 
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
    <div className={cn('flex gap-2 min-w-0 group', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-neutral-700">
          <AvatarImage src={message.sender_profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-neutral-800 text-white">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex items-center gap-1 max-w-[75%]', isOwn ? 'flex-row-reverse' : 'flex-row')}>
        <div
          className={cn(
            'min-w-0 break-words rounded-2xl px-4 py-2',
            isOwn 
              ? 'bg-red-600 text-white rounded-br-md' 
              : 'bg-neutral-800 text-white rounded-bl-md'
          )}
        >
          {isMedia && mediaUrl && (
            <div className="mb-2">
              {mediaType === 'image' ? (
                <img src={mediaUrl} alt="Shared image" className="max-w-full rounded-lg" />
              ) : mediaType === 'video' ? (
                <video src={mediaUrl} controls className="max-w-full rounded-lg" />
              ) : (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 underline break-words text-white"
                >
                  <FileText className="h-4 w-4" />
                  View attachment
                </a>
              )}
            </div>
          )}

          {message.content &&
            message.content !== '[image]' &&
            message.content !== '[video]' &&
            message.content !== '[file]' && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}

          <span
            className={cn(
              'text-xs block mt-1',
              isOwn ? 'text-white/70' : 'text-neutral-400'
            )}
          >
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>
        
        <MessageOptionsMenu
          message={message}
          conversationId={conversationId}
          otherUserId={otherUserId}
          align={isOwn ? 'end' : 'start'}
          className="text-neutral-500 hover:text-white"
        />
      </div>
      
      {isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-neutral-700">
          <AvatarImage src={message.sender_profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-neutral-800 text-white">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}