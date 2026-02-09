import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTutorAvailability, expandAvailabilityToSlots } from '@/hooks/useTutorAvailability';
import { ChevronLeft, ChevronRight, Check, Clock, X } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface SelectedSlot {
  start: Date;
  end: Date;
  matchesAvailability: boolean;
}

interface BookingCalendarProps {
  tutorId: string;
  lessonDurationMinutes: number;
  onSlotsConfirmed?: (slots: SelectedSlot[]) => void;
  minSlots?: number;
  maxSlots?: number;
}

const HOUR_SLOTS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

export function BookingCalendar({
  tutorId,
  lessonDurationMinutes = 60,
  onSlotsConfirmed,
  minSlots = 3,
  maxSlots = 10,
}: BookingCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const studentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: availability } = useTutorAvailability(tutorId);

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Expand tutor availability into concrete slots for this week
  const availableSlots = useMemo(() => {
    if (!availability) return [];
    return expandAvailabilityToSlots(availability, weekStart, weekEnd, studentTimezone);
  }, [availability, weekStart, weekEnd, studentTimezone]);

  // Check if a given hour on a given day falls within tutor availability
  const isAvailable = (day: Date, hour: number): boolean => {
    return availableSlots.some(slot => {
      if (!isSameDay(slot.start, day)) return false;
      const slotStartHour = slot.start.getHours();
      const slotEndHour = slot.end.getHours();
      return hour >= slotStartHour && hour < slotEndHour;
    });
  };

  // Check if a slot is already selected
  const isSelected = (day: Date, hour: number): boolean => {
    return selectedSlots.some(s =>
      isSameDay(s.start, day) && s.start.getHours() === hour
    );
  };

  // Check if a slot is in the past
  const isPast = (day: Date, hour: number): boolean => {
    const slotDate = new Date(day);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate <= new Date();
  };

  const toggleSlot = (day: Date, hour: number) => {
    if (isPast(day, hour)) return;

    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + lessonDurationMinutes);

    const existing = selectedSlots.findIndex(
      s => isSameDay(s.start, day) && s.start.getHours() === hour
    );

    if (existing >= 0) {
      setSelectedSlots(prev => prev.filter((_, i) => i !== existing));
    } else if (selectedSlots.length < maxSlots) {
      setSelectedSlots(prev => [
        ...prev,
        { start, end, matchesAvailability: isAvailable(day, hour) },
      ]);
    }
  };

  const prevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const nextWeek = () => setWeekStart(prev => addDays(prev, 7));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Select Your Preferred Times
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose {minSlots}–{maxSlots} time slots. Green slots match the tutor's availability.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day Headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0.5 mb-1">
              <div />
              {weekDays.map(day => (
                <div key={day.toISOString()} className="text-center">
                  <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                  <p className="text-xs text-muted-foreground">{format(day, 'd')}</p>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {HOUR_SLOTS.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] gap-0.5 mb-0.5">
                <div className="text-xs text-muted-foreground flex items-center justify-end pr-2">
                  {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                </div>
                {weekDays.map(day => {
                  const past = isPast(day, hour);
                  const available = isAvailable(day, hour);
                  const selected = isSelected(day, hour);

                  return (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      type="button"
                      disabled={past}
                      onClick={() => toggleSlot(day, hour)}
                      className={`
                        h-8 rounded-sm text-xs transition-all border
                        ${past
                          ? 'bg-muted/30 border-transparent cursor-not-allowed'
                          : selected
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : available
                              ? 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                              : 'bg-background border-border hover:bg-muted cursor-pointer'
                        }
                      `}
                    >
                      {selected ? <Check className="h-3 w-3 mx-auto" /> : available ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-emerald-500/15 border border-emerald-500/30" />
            <span>Tutor available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-primary" />
            <span>Your selection</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-background border border-border" />
            <span>Custom proposal</span>
          </div>
        </div>

        {/* Selected Slots Summary */}
        {selectedSlots.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Selected ({selectedSlots.length}/{maxSlots}):
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedSlots
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((slot, i) => (
                  <Badge
                    key={i}
                    variant={slot.matchesAvailability ? 'default' : 'outline'}
                    className="gap-1 cursor-pointer"
                    onClick={() => {
                      setSelectedSlots(prev => prev.filter((_, idx) => idx !== i));
                    }}
                  >
                    {format(slot.start, 'EEE d MMM, ha')}
                    {slot.matchesAvailability && <Check className="h-3 w-3" />}
                    <X className="h-3 w-3 ml-0.5" />
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <Button
          className="w-full"
          disabled={selectedSlots.length < minSlots}
          onClick={() => onSlotsConfirmed?.(selectedSlots)}
        >
          {selectedSlots.length < minSlots
            ? `Select at least ${minSlots - selectedSlots.length} more slot${minSlots - selectedSlots.length > 1 ? 's' : ''}`
            : `Propose ${selectedSlots.length} Time Slot${selectedSlots.length > 1 ? 's' : ''}`
          }
        </Button>
      </CardContent>
    </Card>
  );
}
