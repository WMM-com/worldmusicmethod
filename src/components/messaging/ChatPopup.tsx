import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage } from '@/hooks/useMessaging';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Minus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPopup() {
  const { user } = useAuth();
  const { popupConversation, closePopupChat, minimizePopupChat, isMinimized } = useMessagingPopup();
  const { data: messages, isLoading } = useMessages(popupConversation?.id || '');
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');

  if (!user || !popupConversation) return null;

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate({ conversationId: popupConversation.id, content: newMessage.trim() });
    setNewMessage('');
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 rounded-t-lg">
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
          <ScrollArea className="flex-1 p-3">
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
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] px-3 py-2 rounded-lg text-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-2 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="text-sm h-9"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />
              <Button
                size="icon"
                className="h-9 w-9"
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessage.isPending}
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
