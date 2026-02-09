import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTutorBookingRequests, useUpdateBookingStatus, useUpdateSlotStatus } from '@/hooks/useBookings';
import { useTutorAvailability, expandAvailabilityToSlots } from '@/hooks/useTutorAvailability';
import { Inbox, Check, X, Clock, CalendarCheck, Video, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sendBookingNotification, createBookingRoom } from '@/lib/bookingIntegrations';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  tutor_reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment_pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function TutorRequestManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: requests, isLoading } = useTutorBookingRequests();
  const updateStatus = useUpdateBookingStatus();
  const updateSlotStatus = useUpdateSlotStatus();
  const { data: availability } = useTutorAvailability(user?.id);

  // Check if a proposed slot matches tutor's general availability
  const slotMatchesAvailability = (slotStart: string): boolean => {
    if (!availability?.length) return false;
    const startDate = new Date(slotStart);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    const expanded = expandAvailabilityToSlots(availability, 
      new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
      new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59),
      'UTC'
    );
    return expanded.some(a => {
      return a.start.getHours() <= startDate.getHours() && a.end.getHours() > startDate.getHours()
        && a.start.getDay() === startDate.getDay();
    });
  };

  const handleSelectSlot = async (slotId: string, requestId: string) => {
    try {
      await updateSlotStatus.mutateAsync({ slotId, status: 'selected_by_tutor' });
      await updateStatus.mutateAsync({ requestId, status: 'tutor_reviewed' });
      sendBookingNotification(requestId, 'tutor_reviewed');
      toast.success('Slot selected. Student will be notified.');
    } catch {
      toast.error('Failed to select slot');
    }
  };

  const handleConfirm = async (requestId: string) => {
    try {
      await updateStatus.mutateAsync({ requestId, status: 'payment_pending' });
      sendBookingNotification(requestId, 'payment_pending');
      toast.success('Request confirmed. Awaiting student payment.');
    } catch {
      toast.error('Failed to confirm request');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await updateStatus.mutateAsync({ requestId, status: 'cancelled' });
      sendBookingNotification(requestId, 'cancelled');
      toast.success('Request cancelled');
    } catch {
      toast.error('Failed to cancel request');
    }
  };

  const handleCreateRoom = async (requestId: string, roomId?: string) => {
    if (roomId) {
      // Room already exists, navigate to it
      const { data: room } = await (await import('@/integrations/supabase/client')).supabase
        .from('video_rooms')
        .select('room_name')
        .eq('id', roomId)
        .single();
      if (room) navigate(`/meet/${room.room_name}`);
      return;
    }
    const result = await createBookingRoom(requestId);
    if (result?.room) {
      toast.success('Video room created!');
      navigate(`/meet/${result.room.room_name}`);
    } else {
      toast.error('Failed to create video room');
    }
  };

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const activeRequests = requests?.filter(r => ['tutor_reviewed', 'payment_pending', 'confirmed'].includes(r.status)) || [];
  const pastRequests = requests?.filter(r => ['completed', 'cancelled'].includes(r.status)) || [];

  const renderRequest = (request: any) => {
    const student = request.student;
    const lesson = request.lesson;
    const slots = request.slots || [];

    return (
      <Card key={request.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={student?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{student?.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{student?.full_name || student?.email || 'Student'}</p>
                <p className="text-xs text-muted-foreground truncate">{lesson?.title}</p>
              </div>
            </div>
            <Badge className={`shrink-0 text-xs ${STATUS_COLORS[request.status] || ''}`}>
              {request.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Proposed Slots */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Proposed times:</p>
            {slots.map((slot: any) => {
              const matches = slotMatchesAvailability(slot.start_time);
              return (
                <div key={slot.id} className={`flex items-center justify-between p-2 rounded-md text-sm ${
                  slot.status === 'selected_by_tutor' 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    {matches && (
                      <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span>
                      {format(new Date(slot.start_time), 'EEE d MMM, h:mma')}
                      {' – '}
                      {format(new Date(slot.end_time), 'h:mma')}
                    </span>
                    {matches && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Matches availability</span>
                    )}
                  </div>
                  {request.status === 'pending' && slot.status === 'proposed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleSelectSlot(slot.id, request.id)}
                    >
                      <Check className="h-3 w-3 mr-1" /> Select
                    </Button>
                  )}
                  {slot.status === 'selected_by_tutor' && (
                    <Badge variant="default" className="text-xs">Selected</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {request.status === 'tutor_reviewed' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1" onClick={() => handleConfirm(request.id)}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept & Send to Student
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCancel(request.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {request.status === 'confirmed' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCreateRoom(request.id, request.video_room_id)}>
                <Video className="h-3.5 w-3.5 mr-1" /> {request.video_room_id ? 'Join Video Room' : 'Create Video Room'}
              </Button>
            </div>
          )}
          {request.status === 'payment_pending' && (
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Awaiting student payment...</span>
            </div>
          )}
          {request.status === 'pending' && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleCancel(request.id)}>
                Cancel Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading requests...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Inbox className="h-4 w-4" /> 
            New Requests ({pendingRequests.length})
          </h3>
          {pendingRequests.map(renderRequest)}
        </div>
      )}

      {/* Active */}
      {activeRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> 
            Active ({activeRequests.length})
          </h3>
          {activeRequests.map(renderRequest)}
        </div>
      )}

      {/* Past */}
      {pastRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Past ({pastRequests.length})</h3>
          {pastRequests.map(renderRequest)}
        </div>
      )}

      {!requests?.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No booking requests yet.</p>
          <p className="text-sm mt-1">When students book your lessons, requests will appear here.</p>
        </div>
      )}
    </div>
  );
}
