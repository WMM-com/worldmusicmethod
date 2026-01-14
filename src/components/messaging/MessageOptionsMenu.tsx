import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSoftDeleteMessage, Message } from '@/hooks/useMessaging';
import { useCreateReport, useBlockUser, REPORT_REASONS, ReportReason } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Trash2, Flag, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageOptionsMenuProps {
  message: Message;
  conversationId: string;
  otherUserId?: string;
  className?: string;
  align?: 'start' | 'end';
}

export function MessageOptionsMenu({ 
  message, 
  conversationId, 
  otherUserId,
  className,
  align = 'end' 
}: MessageOptionsMenuProps) {
  const { user } = useAuth();
  const softDeleteMessage = useSoftDeleteMessage();
  const createReport = useCreateReport();
  const blockUser = useBlockUser();
  
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('too_negative');
  const [reportDetails, setReportDetails] = useState('');

  const isOwn = message.sender_id === user?.id;

  const handleDelete = () => {
    softDeleteMessage.mutate({ messageId: message.id, conversationId });
    setShowDeleteAlert(false);
  };

  const handleReport = () => {
    createReport.mutate({
      reportType: 'user',
      reason: reportReason,
      reportedUserId: message.sender_id,
      details: reportDetails || undefined,
    });
    setShowReportDialog(false);
    setReportReason('too_negative');
    setReportDetails('');
  };

  const handleBlock = () => {
    if (otherUserId) {
      blockUser.mutate(otherUserId);
    }
    setShowBlockAlert(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity", className)}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-48">
          <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {isOwn ? 'Delete Message' : 'Remove for Me'}
          </DropdownMenuItem>
          
          {!isOwn && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBlockAlert(true)} className="text-destructive focus:text-destructive">
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isOwn ? 'Delete Message?' : 'Remove Message?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isOwn 
                ? 'This message will be removed from your view.'
                : 'This message will be hidden from your view only. The sender will still see it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isOwn ? 'Delete' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value}>{reason.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={createReport.isPending}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Alert */}
      <AlertDialog open={showBlockAlert} onOpenChange={setShowBlockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message you or see your posts. You can unblock them later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
