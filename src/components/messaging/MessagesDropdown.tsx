import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, User, Send, PenLine, MoreVertical, Trash2, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConversations, useUnreadMessageCount, useCreateConversation, useDeleteConversation } from '@/hooks/useMessaging';
import { useFriendships } from '@/hooks/useSocial';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { useMessagingPopup } from '@/contexts/MessagingContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function MessagesDropdown() {
  const [open, setOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const { data: conversations, isLoading } = useConversations();
  const { data: unreadCount } = useUnreadMessageCount();
  const { data: friendships } = useFriendships();
  const createConversation = useCreateConversation();
  const { openPopupChat } = useMessagingPopup();
  const navigate = useNavigate();

  const handleConversationClick = (conversation: any) => {
    const participant = conversation.participants?.[0];
    openPopupChat({
      id: conversation.id,
      participantId: participant?.id,
      participantName: participant?.full_name || 'Unknown',
      participantAvatar: participant?.avatar_url,
      participantUsername: participant?.username,
    });
    setOpen(false);
  };

  const handleStartConversation = async (friendId: string, friendName: string, friendAvatar: string | null) => {
    const conversationId = await createConversation.mutateAsync(friendId);
    openPopupChat({
      id: conversationId,
      participantId: friendId,
      participantName: friendName,
      participantAvatar: friendAvatar || undefined,
    });
    setNewChatOpen(false);
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
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600 hover:bg-red-600 text-white border-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-neutral-800 bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-neutral-800 bg-[#111111]">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-red-500 rotate-[-20deg]" />
              <h4 className="font-semibold text-sm text-white">
                Messages
              </h4>
            </div>
            <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-400 hover:bg-neutral-800 h-7 px-2"
                >
                  <PenLine className="h-3 w-3 mr-1" />
                  Write
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
                        const friendUserId = friend.other_user_id || friend.friend_id;
                        const friendName = friend.profiles?.full_name || friend.profiles?.email || 'Unknown';
                        const friendAvatar = friend.profiles?.avatar_url || null;
                        return (
                          <button
                            key={friend.id}
                            onClick={() => handleStartConversation(friendUserId, friendName, friendAvatar)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors text-left"
                            disabled={createConversation.isPending}
                          >
                            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-neutral-700">
                              <AvatarImage src={friendAvatar || undefined} />
                              <AvatarFallback className="bg-neutral-800 text-white">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate text-white">{friendName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="p-4 text-center text-neutral-500">
              Loading...
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="relative inline-block mb-3">
                <MessageSquare className="h-10 w-10 mx-auto text-neutral-600" />
                <Send className="h-4 w-4 absolute -top-1 -right-1 text-red-500 rotate-[-30deg]" />
              </div>
              <p className="text-sm font-medium text-neutral-400">No messages yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Your conversations will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {conversations.map((conversation: any) => (
                <DropdownConversationItem 
                  key={conversation.id}
                  conversation={conversation}
                  onClick={() => handleConversationClick(conversation)}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-2 border-t border-neutral-800 bg-[#111111]">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-red-500 hover:text-red-400 hover:bg-neutral-800"
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

// Individual conversation item with dropdown menu
function DropdownConversationItem({ 
  conversation, 
  onClick,
  onClose 
}: { 
  conversation: any;
  onClick: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const participant = conversation.participants?.[0];
  const hasUnread = conversation.unread_count > 0;
  const deleteConversation = useDeleteConversation();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('too_negative');
  const [reportDetails, setReportDetails] = useState('');

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (participant?.id) {
      navigate(`/${(participant as any).username || participant.id}`);
      onClose();
    }
  };

  const handleDelete = () => {
    deleteConversation.mutate(conversation.id);
    setShowDeleteAlert(false);
  };

  const handleReport = () => {
    if (participant?.id) {
      createReport.mutate({
        reportType: 'user',
        reason: reportReason,
        reportedUserId: participant.id,
        details: reportDetails || undefined,
      });
    }
    setShowReportDialog(false);
    setReportReason('too_negative');
    setReportDetails('');
  };

  const handleBlock = () => {
    if (participant?.id) {
      blockUser.mutate(participant.id);
    }
    setShowBlockAlert(false);
  };

  return (
    <>
      <div
        className={cn(
          'p-3 hover:bg-neutral-900 transition-colors cursor-pointer group relative',
          hasUnread && 'bg-neutral-900/50'
        )}
      >
        <div className="flex gap-3">
          <div className="relative shrink-0" onClick={onClick}>
            <Avatar className="h-10 w-10 ring-2 ring-neutral-700">
              <AvatarImage src={participant?.avatar_url || undefined} />
              <AvatarFallback className="bg-neutral-800 text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            {hasUnread && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-600 border-2 border-[#0a0a0a]" />
            )}
          </div>
          <div className="flex-1 min-w-0" onClick={onClick}>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-sm truncate text-white",
                  hasUnread ? "font-semibold" : "font-medium"
                )}
                style={{ maxWidth: '100px' }}
              >
                {participant?.full_name || 'Unknown'}
              </p>
              <span className="text-[10px] text-neutral-500 shrink-0">
                {conversation.last_message_at &&
                  formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
              </span>
            </div>
            <p
              className={cn(
                "text-xs truncate mt-0.5",
                hasUnread ? "text-neutral-300" : "text-neutral-500"
              )}
              style={{ maxWidth: '150px' }}
            >
              {conversation.last_message?.content || 'Start a conversation'}
            </p>
            {hasUnread && (
              <Badge className="mt-1 h-5 px-1.5 text-[10px] bg-red-600 hover:bg-red-600 text-white border-0">
                {conversation.unread_count} new
              </Badge>
            )}
          </div>
          
          {/* 3-dots menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 text-neutral-500 hover:text-white hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-neutral-800 w-48">
              <DropdownMenuItem 
                onClick={handleViewProfile}
                className="text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportDialog(true);
                }}
                className="text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBlockAlert(true);
                }}
                className="text-red-500 hover:bg-neutral-800 focus:bg-neutral-800 hover:text-red-500 focus:text-red-500 cursor-pointer"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteAlert(true);
                }}
                className="text-red-500 hover:bg-neutral-800 focus:bg-neutral-800 hover:text-red-500 focus:text-red-500 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This conversation will be removed from your inbox. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#0a0a0a] border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">Report User</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Help us understand what's wrong. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={`dropdown-${conversation.id}-${reason.value}`} className="border-neutral-600 text-white" />
                  <Label htmlFor={`dropdown-${conversation.id}-${reason.value}`} className="text-white">{reason.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</Button>
            <Button onClick={handleReport} disabled={createReport.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Alert */}
      <AlertDialog open={showBlockAlert} onOpenChange={setShowBlockAlert}>
        <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Block User?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              They won't be able to message you or see your posts. You can unblock them later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-red-600 text-white hover:bg-red-700">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}