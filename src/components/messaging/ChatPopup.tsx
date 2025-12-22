import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage } from '@/hooks/useMessaging';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Minus, Send, Paperclip, Image, Video, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ChatPopup() {
  const { user } = useAuth();
  const { popupConversation, closePopupChat, minimizePopupChat, isMinimized } = useMessagingPopup();
  const { data: messages, isLoading } = useMessages(popupConversation?.id || '');
  const sendMessage = useSendMessage();
  const { uploadFile, isUploading } = useR2Upload();
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; url: string; type: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  if (!user || !popupConversation) return null;

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
        "fixed bottom-6 right-6 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-200",
        isMinimized ? "h-12" : "h-[450px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 rounded-t-lg shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={popupConversation.participantAvatar} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm truncate max-w-[160px]">
            {popupConversation.participantName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={minimizePopupChat}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
            className="flex-1 overflow-y-auto p-3 min-h-0"
          >
            {isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                No messages yet. Say hello!
              </div>
            ) : (
              <div className="space-y-2">
                {messages?.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const isMedia = msg.message_type === 'media';
                  const mediaUrl = msg.metadata?.mediaUrl;
                  const mediaType = msg.metadata?.mediaType;

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex min-w-0', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] min-w-0 px-3 py-2 rounded-lg text-sm break-words',
                          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
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
                        {msg.content && !msg.content.startsWith('[') && (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attachment Preview */}
          {attachment && (
            <div className="px-2 pb-1 shrink-0">
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
          <div className="p-2 border-t border-border shrink-0">
            <div className="flex gap-1 items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.zip"
                className="hidden"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
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
                        fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.zip';
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
                className="text-sm min-h-[36px] max-h-28 resize-none flex-1"
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
            <p className="mt-1 text-[11px] text-muted-foreground">
              Allowed: images, videos, PDF, Word, Excel, PPT, TXT, CSV, ZIP
            </p>
          </div>
        </>
      )}
    </div>
  );
}
