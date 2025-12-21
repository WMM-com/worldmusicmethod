import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, useSendMessage } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, ChevronLeft, Send, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MessagingPopup() {
  const { user } = useAuth();
  const { data: conversations } = useConversations();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;

  if (!user) return null;

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {totalUnread}
            </Badge>
          )}
        </Button>
      )}

      {/* Chat popup */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-200",
            isMinimized ? "h-12" : "h-[450px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              {selectedConversationId && !isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedConversationId(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="font-semibold text-sm">
                {selectedConversation ? selectedConversation.participants?.[0]?.full_name || 'Chat' : 'Messages'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedConversationId(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <>
              {selectedConversationId ? (
                <ChatView
                  conversationId={selectedConversationId}
                  participantName={selectedConversation?.participants?.[0]?.full_name || 'User'}
                />
              ) : (
                <ConversationsList
                  conversations={conversations || []}
                  onSelect={setSelectedConversationId}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function ConversationsList({
  conversations,
  onSelect,
}: {
  conversations: any[];
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
        No conversations yet
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={conv.participants?.[0]?.avatar_url} />
              <AvatarFallback>
                {conv.participants?.[0]?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">
                  {conv.participants?.[0]?.full_name || 'Unknown'}
                </p>
                {conv.unread_count > 0 && (
                  <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
              {conv.last_message && (
                <p className="text-xs text-muted-foreground truncate">
                  {conv.last_message.content}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function ChatView({
  conversationId,
  participantName,
}: {
  conversationId: string;
  participantName: string;
}) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate({ conversationId, content: newMessage.trim() });
    setNewMessage('');
  };

  return (
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
  );
}
