import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, User, Calendar, Clock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  conversationId: string;
  participantName?: string;
}

export function MessageThread({ conversationId, participantName }: MessageThreadProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;

    await sendMessage.mutateAsync({
      conversationId,
      content: content.trim(),
    });
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      <Card className="h-full flex flex-col">
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
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-border pb-4">
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

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!content.trim() || sendMessage.isPending}
            size="icon"
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
  const isBookingLink = message.message_type === 'booking_link';

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
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
