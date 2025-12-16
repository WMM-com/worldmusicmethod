import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Event } from '@/types/database';

interface EventCalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function EventCalendarView({ events, onEventClick }: EventCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with day of week
  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...days];

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/80 text-success-foreground';
      case 'pencilled': return 'bg-warning/80 text-warning-foreground';
      case 'completed': return 'bg-primary/80 text-primary-foreground';
      case 'cancelled': return 'bg-destructive/80 text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="glass">
      <CardContent className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-[80px]" />;
            }

            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-1 rounded-lg border ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border/50'
                } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
              >
                <div className={`text-xs mb-1 ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${getStatusColor(event.status)} hover:opacity-80 transition-opacity`}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-success/80" />
            <span className="text-xs text-muted-foreground">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-warning/80" />
            <span className="text-xs text-muted-foreground">Pencilled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/80" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
