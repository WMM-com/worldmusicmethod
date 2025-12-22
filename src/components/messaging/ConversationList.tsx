import { useConversations, useCreateConversation, useDeleteConversation, Conversation } from '@/hooks/useMessaging';
import { useFriendships } from '@/hooks/useSocial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, User, Trash2, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  selectedId?: string;
}

export function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
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
      <Card>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {friendships?.friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add friends to start a conversation
                  </p>
                ) : (
                  friendships?.friends.map((friend) => {
                    const friendUserId = friend.friend_id;
                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleStartConversation(friendUserId)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    deleteConversation.mutate(conversation.id);
    setShowDeleteAlert(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left cursor-pointer group ${
          isSelected ? 'bg-muted/50' : ''
        }`}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">
              {participant?.full_name || 'Unknown'}
            </span>
            {conversation.last_message && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
          {conversation.last_message && (
            <p className="text-sm text-muted-foreground truncate">
              {conversation.last_message.content}
            </p>
          )}
        </div>
        {conversation.unread_count > 0 && (
          <Badge variant="default" className="ml-2">
            {conversation.unread_count}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation for you. The other participant will still be able to see their copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
