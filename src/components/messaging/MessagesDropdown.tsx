import { useState } from 'react';
import { MessageSquare, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConversations, useUnreadMessageCount } from '@/hooks/useMessaging';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function MessagesDropdown() {
  const [open, setOpen] = useState(false);
  const { data: conversations, isLoading } = useConversations();
  const { data: unreadCount } = useUnreadMessageCount();
  const { openPopupChat } = useMessagingPopup();
  const navigate = useNavigate();

  const handleConversationClick = (conversation: any) => {
    const participant = conversation.participants?.[0];
    openPopupChat({
      id: conversation.id,
      participantName: participant?.full_name || 'Unknown',
      participantAvatar: participant?.avatar_url,
    });
    setOpen(false);
  };

  const handleViewAll = () => {
    navigate('/messages');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-500 hover:bg-amber-500 text-amber-950"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-amber-200/30 bg-background">
        {/* Hermes-themed header with winged sandal motif */}
        <div className="relative overflow-hidden border-b border-amber-200/20">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10" />
          <div className="relative flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Send className="h-5 w-5 text-amber-500 rotate-[-20deg]" />
                {/* Tiny wing decorations */}
                <span className="absolute -top-0.5 -right-1 text-[8px]">✦</span>
              </div>
              <h4 className="font-semibold bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
                Messages
              </h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              View All
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="relative inline-block mb-3">
                <MessageSquare className="h-10 w-10 mx-auto text-amber-300" />
                <Send className="h-4 w-4 absolute -top-1 -right-1 text-amber-400 rotate-[-30deg]" />
              </div>
              <p className="text-sm font-medium text-amber-600/70">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Swift as Hermes, your messages will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-amber-100/50">
              {conversations.map((conversation: any) => {
                const participant = conversation.participants?.[0];
                const hasUnread = conversation.unread_count > 0;
                
                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      'p-3 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer group relative',
                      hasUnread && 'bg-amber-50/30 dark:bg-amber-900/5'
                    )}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-amber-200/30">
                          <AvatarImage src={participant?.avatar_url || undefined} />
                          <AvatarFallback className="bg-amber-100 text-amber-700">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm",
                            hasUnread ? "font-semibold" : "font-medium"
                          )}>
                            {participant?.full_name || 'Unknown'}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {conversation.last_message_at && 
                              formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm truncate",
                          hasUnread ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {conversation.last_message || 'Start a conversation'}
                        </p>
                        {hasUnread && (
                          <Badge className="mt-1 h-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500 text-amber-950">
                            {conversation.unread_count} new
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer with subtle Hermes touch */}
        <div className="p-2 border-t border-amber-200/20 bg-amber-50/30 dark:bg-amber-900/5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
            onClick={handleViewAll}
          >
            <Send className="h-3 w-3 mr-1.5 rotate-[-20deg]" />
            Open Messenger
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}