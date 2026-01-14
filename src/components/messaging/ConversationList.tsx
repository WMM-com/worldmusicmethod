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
      <Card className="bg-[#0a0a0a] border-neutral-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 bg-neutral-800" />
          <Skeleton className="h-16 bg-neutral-800" />
          <Skeleton className="h-16 bg-neutral-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0a0a0a] border-neutral-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-neutral-800">
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-neutral-800">
            <DialogHeader>
              <DialogTitle className="text-white">New Conversation</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-2">
                <p className="text-xs text-neutral-500 px-2 mb-2">Select a friend to message:</p>
                {!friendships?.friends || friendships.friends.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">
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
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors text-left"
                      >
                      <Avatar className="h-10 w-10 ring-2 ring-neutral-700">
                        <AvatarImage src={friend.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-neutral-800 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-white">
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
            <div className="p-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
              <p className="text-sm text-neutral-500">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
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
      className={`relative flex items-center gap-3 p-4 hover:bg-neutral-900 transition-colors cursor-pointer ${
        isSelected ? 'bg-neutral-900 border-l-2 border-l-red-600' : ''
      }`}
    >
      <div className="flex-1 flex items-center gap-3" onClick={onClick}>
        <Avatar className="h-10 w-10 ring-2 ring-neutral-700">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback className="bg-neutral-800 text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="font-medium flex-1 min-w-0 whitespace-normal break-words leading-tight text-white">
              {participant?.full_name || 'Unknown'}
            </span>
            {conversation.last_message && (
              <span className="text-xs text-neutral-500 shrink-0">
                {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
          {conversation.last_message && (
            <p className="text-sm text-neutral-400 truncate">
              {conversation.last_message.content}
            </p>
          )}
        </div>
        {conversation.unread_count > 0 && (
          <Badge className="ml-2 bg-red-600 hover:bg-red-600 text-white border-0">
            {conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 text-neutral-500 hover:text-red-500 hover:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This will delete all messages in this conversation for you. The other participant will still be able to see their copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}