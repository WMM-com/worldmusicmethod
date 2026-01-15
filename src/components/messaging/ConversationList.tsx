import { useNavigate } from 'react-router-dom';
import { useConversations, useCreateConversation, useDeleteConversation, Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendships } from '@/hooks/useSocial';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Plus, User, MoreVertical, Trash2, Flag, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const navigate = useNavigate();
  const participant = conversation.participants?.[0];
  const deleteConversation = useDeleteConversation();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('too_negative');
  const [reportDetails, setReportDetails] = useState('');

  const handleDelete = () => {
    deleteConversation.mutate(conversation.id);
    setShowDeleteAlert(false);
  };

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (participant?.id) {
      navigate(`/profile/${participant.id}`);
    }
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
        className={`group relative hover:bg-neutral-900 transition-colors cursor-pointer ${
          isSelected ? 'bg-neutral-900 border-l-2 border-l-red-600' : ''
        }`}
      >
        {/* Main clickable area */}
        <div className="flex items-center gap-3 p-4 pr-12" onClick={onClick}>
          <Avatar className="h-10 w-10 ring-2 ring-neutral-700 shrink-0">
            <AvatarImage src={participant?.avatar_url || undefined} />
            <AvatarFallback className="bg-neutral-800 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="font-medium flex-1 min-w-0 truncate leading-tight text-white">
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
            <Badge className="bg-red-600 hover:bg-red-600 text-white border-0 shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>

        {/* Dropdown menu - positioned absolutely */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-neutral-800"
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
                  <RadioGroupItem value={reason.value} id={`conv-${conversation.id}-${reason.value}`} className="border-neutral-600 text-white" />
                  <Label htmlFor={`conv-${conversation.id}-${reason.value}`} className="text-white">{reason.label}</Label>
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