import { useConversations, useCreateConversation, useDeleteConversation, Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendships } from '@/hooks/useSocial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, User, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  selectedId?: string;
}

export function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const { data: friendships } = useFriendships();
  const createConversation = useCreateConversation();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const handleStartConversation = async (friendId: string) => {
    const conversationId = await createConversation.mutateAsync(friendId);
    onSelectConversation(conversationId);
    setNewChatOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-2">
                <p className="text-xs text-muted-foreground px-2 mb-2">Select a friend to message:</p>
                {!friendships?.friends || friendships.friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No friends yet. You can still message members from their profile page.
                  </p>
                ) : (
                  friendships?.friends.map((friend) => {
                    // Use other_user_id if available, otherwise compute it
                    const friendUserId = friend.other_user_id || (friend.user_id === user?.id ? friend.friend_id : friend.user_id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleStartConversation(friendUserId)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                      >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {friend.profiles?.full_name || friend.profiles?.email}
                      </span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {conversations?.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations?.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const participant = conversation.participants?.[0];
  const deleteConversation = useDeleteConversation();

  const handleDelete = () => {
    deleteConversation.mutate(conversation.id);
  };

  return (
    <div
      className={`relative flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer ${
        isSelected ? 'bg-accent/50' : ''
      }`}
    >
      <div className="flex-1 flex items-center gap-3" onClick={onClick}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1 min-w-0 truncate">
              {participant?.full_name || 'Unknown'}
            </span>
            {conversation.last_message && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
          {conversation.last_message && (
            <p className="text-sm text-muted-foreground truncate min-w-0">
              {conversation.last_message.content}
            </p>
          )}
        </div>
        {conversation.unread_count > 0 && (
          <Badge variant="default" className="ml-2">
            {conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation for you. The other participant will still be able to see their copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}