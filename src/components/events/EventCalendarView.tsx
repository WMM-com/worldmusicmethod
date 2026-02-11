import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Event } from '@/types/database';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  useSensor, 
  useSensors, 
  PointerSensor,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface EventCalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onEventReschedule?: (eventId: string, newDate: Date) => void;
  onDateClick?: (date: Date) => void;
}

interface DraggableEventProps {
  event: Event;
  onEventClick?: (event: Event) => void;
  getStatusColor: (status: string) => string;
}

function DraggableEvent({ event, onEventClick, getStatusColor }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick?.(event);
      }}
      className={cn(
        "w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-all flex items-center gap-0.5 group",
        getStatusColor(event.status),
        isDragging ? "opacity-50" : "hover:opacity-80"
      )}
    >
      <span 
        {...attributes} 
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

interface DroppableDayProps {
  day: Date;
  isToday: boolean;
  isSameMonthDay: boolean;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
  getStatusColor: (status: string) => string;
}

function DroppableDay({ day, isToday, isSameMonthDay, events, onEventClick, onDateClick, getStatusColor }: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: day.toISOString(),
    data: { day },
  });

  const handleDayClick = (e: React.MouseEvent) => {
    // Only trigger if clicking the day cell itself, not an event
    if ((e.target as HTMLElement).closest('button[data-event]')) return;
    onDateClick?.(day);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleDayClick}
      className={cn(
        "min-h-[80px] p-1 rounded-lg border transition-all cursor-pointer hover:bg-secondary/30",
        isToday ? 'border-primary bg-primary/5' : 'border-border/50',
        !isSameMonthDay && 'opacity-50',
        isOver && 'bg-primary/10 border-primary ring-2 ring-primary/30'
      )}
    >
      <div className={cn(
        "text-xs mb-1",
        isToday ? 'font-bold text-primary' : 'text-muted-foreground'
      )}>
        {format(day, 'd')}
      </div>
      <div className="space-y-0.5">
        {events.slice(0, 3).map(event => (
          <DraggableEvent
            key={event.id}
            event={event}
            onEventClick={onEventClick}
            getStatusColor={getStatusColor}
            data-event
          />
        ))}
        {events.length > 3 && (
          <div className="text-[10px] text-muted-foreground px-1">
            +{events.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export function EventCalendarView({ events, onEventClick, onEventReschedule, onDateClick }: EventCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as Event;
    setActiveEvent(draggedEvent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEvent(null);
    
    const { active, over } = event;
    
    if (!over || !onEventReschedule) return;
    
    const eventId = active.id as string;
    const newDate = new Date(over.id as string);
    const draggedEvent = active.data.current?.event as Event;
    
    // Don't do anything if dropped on the same day
    if (draggedEvent && isSameDay(new Date(draggedEvent.start_time), newDate)) {
      return;
    }
    
    onEventReschedule(eventId, newDate);
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

        {/* Calendar Grid with DnD */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[80px]" />;
              }

              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <DroppableDay
                  key={day.toISOString()}
                  day={day}
                  isToday={isToday}
                  isSameMonthDay={isSameMonth(day, currentMonth)}
                  events={dayEvents}
                  onEventClick={onEventClick}
                  onDateClick={onDateClick}
                  getStatusColor={getStatusColor}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeEvent ? (
              <div className={cn(
                "text-[10px] px-2 py-1 rounded shadow-lg",
                getStatusColor(activeEvent.status)
              )}>
                {activeEvent.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Drag hint */}
        {onEventReschedule && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Drag events to reschedule them
          </p>
        )}

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
