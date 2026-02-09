import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useMyAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useTutorAvailability';
import { Clock, Plus, Trash2, CalendarDays, Repeat, Calendar as CalIcon } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Africa/Lagos',
  'Africa/Nairobi',
];

export function TutorAvailabilityManager() {
  const { data: availability, isLoading } = useMyAvailability();
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();

  const [showForm, setShowForm] = useState(false);
  const [isRecurring, setIsRecurring] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<string>('1');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [specificDate, setSpecificDate] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const handleAdd = async () => {
    if (!startTime || !endTime) {
      toast.error('Please set start and end times');
      return;
    }
    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }
    if (!isRecurring && !specificDate) {
      toast.error('Please select a date for the one-off slot');
      return;
    }

    try {
      await createAvailability.mutateAsync({
        is_recurring: isRecurring,
        day_of_week: isRecurring ? parseInt(dayOfWeek) : null,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        timezone,
        specific_date: !isRecurring ? specificDate : null,
      });
      toast.success('Availability added');
      setShowForm(false);
    } catch {
      toast.error('Failed to add availability');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailability.mutateAsync(id);
      toast.success('Availability removed');
    } catch {
      toast.error('Failed to remove availability');
    }
  };

  const recurringSlots = availability?.filter(a => a.is_recurring) || [];
  const oneOffSlots = availability?.filter(a => !a.is_recurring) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          General Availability
        </CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Slot
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set your general availability so students can see when you're typically free. 
          You still approve every booking manually.
        </p>

        {/* Add Form */}
        {showForm && (
          <Card className="border-primary/20">
            <CardContent className="pt-4 space-y-4">
              {/* Recurring toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRecurring ? <Repeat className="h-4 w-4" /> : <CalIcon className="h-4 w-4" />}
                  <Label>{isRecurring ? 'Recurring (weekly)' : 'One-off slot'}</Label>
                </div>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>

              {/* Day or Date */}
              {isRecurring ? (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={e => setSpecificDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={createAvailability.isPending}>
                  {createAvailability.isPending ? 'Adding...' : 'Add Availability'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Slots */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* Recurring */}
            {recurringSlots.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Repeat className="h-3.5 w-3.5" /> Weekly Schedule
                </h4>
                <div className="space-y-1.5">
                  {recurringSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-2.5 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {DAYS_OF_WEEK[slot.day_of_week!]}
                        </Badge>
                        <span className="text-sm">
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({slot.timezone.replace(/_/g, ' ')})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(slot.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* One-off */}
            {oneOffSlots.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> One-off Slots
                </h4>
                <div className="space-y-1.5">
                  {oneOffSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-2.5 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {slot.specific_date}
                        </Badge>
                        <span className="text-sm">
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({slot.timezone.replace(/_/g, ' ')})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(slot.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurringSlots.length === 0 && oneOffSlots.length === 0 && !showForm && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No availability set yet. Students can still propose times when booking.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
