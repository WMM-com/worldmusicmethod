import { useMemo } from 'react';
import { StagePlotItem, STAGE_ICONS, MIC_TYPES, IconType } from '@/types/techSpec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StageIcon } from './StageIcon';
import { Zap, Plug, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface ChannelListProps {
  items: StagePlotItem[];
  onUpdateChannel?: (itemId: string, channelNumber: number) => void;
}

interface SortableRowProps {
  item: StagePlotItem;
}

function SortableRow({ item }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const iconInfo = STAGE_ICONS.find(i => i.type === item.icon_type);
  const micInfo = item.mic_type ? MIC_TYPES.find(m => m.value === item.mic_type) : null;
  const displayLabel = item.label || iconInfo?.label || item.icon_type;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && 'opacity-50 bg-muted',
        'hover:bg-muted/50'
      )}
    >
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-mono font-bold text-lg w-14">
        {item.channel_number}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <StageIcon type={item.icon_type as IconType} size={20} />
          <span className="font-medium">{displayLabel}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {micInfo?.label || item.mic_type || '-'}
      </TableCell>
      <TableCell className="text-center w-14">
        {item.phantom_power && (
          <Zap className="h-4 w-4 text-yellow-500 mx-auto" />
        )}
      </TableCell>
      <TableCell className="text-center w-14">
        {item.insert_required && (
          <Plug className="h-4 w-4 text-blue-500 mx-auto" />
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.monitor_mixes?.map((mix, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {mix}
            </Badge>
          ))}
          {(!item.monitor_mixes || item.monitor_mixes.length === 0) && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.fx_sends?.map((fx, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {fx}
            </Badge>
          ))}
          {(!item.fx_sends || item.fx_sends.length === 0) && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-20">
        <Badge 
          variant={item.provided_by === 'venue' ? 'default' : item.provided_by === 'artist' ? 'secondary' : 'outline'}
        >
          {item.provided_by === 'venue' ? 'Venue' : item.provided_by === 'artist' ? 'Artist' : 'TBD'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export function ChannelList({ items, onUpdateChannel }: ChannelListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and sort items that have channel numbers assigned
  const channelItems = useMemo(() => {
    return items
      .filter(item => item.channel_number !== null)
      .sort((a, b) => (a.channel_number || 0) - (b.channel_number || 0));
  }, [items]);

  const unassignedItems = useMemo(() => {
    return items.filter(item => item.channel_number === null);
  }, [items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onUpdateChannel) {
      const oldIndex = channelItems.findIndex((item) => item.id === active.id);
      const newIndex = channelItems.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder the array
        const reordered = arrayMove(channelItems, oldIndex, newIndex);
        
        // Update channel numbers based on new positions
        reordered.forEach((item, index) => {
          const newChannelNumber = index + 1;
          if (item.channel_number !== newChannelNumber) {
            onUpdateChannel(item.id, newChannelNumber);
          }
        });
      }
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No equipment added yet. Add items to the stage plot first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Channel List / Input List</CardTitle>
        <p className="text-sm text-muted-foreground">
          {channelItems.length} channels assigned • {unassignedItems.length} unassigned
          {onUpdateChannel && channelItems.length > 1 && ' • Drag rows to reorder'}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-14">Ch</TableHead>
                <TableHead>Input / Source</TableHead>
                <TableHead>Mic / DI</TableHead>
                <TableHead className="w-14 text-center">48V</TableHead>
                <TableHead className="w-14 text-center">Ins</TableHead>
                <TableHead>Mon Mixes</TableHead>
                <TableHead>FX Sends</TableHead>
                <TableHead className="w-20">Provider</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={channelItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {channelItems.map((item) => (
                  <SortableRow key={item.id} item={item} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>

        {unassignedItems.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Unassigned Items ({unassignedItems.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedItems.map((item) => {
                const iconInfo = STAGE_ICONS.find(i => i.type === item.icon_type);
                return (
                  <div key={item.id} className="flex items-center gap-1 text-sm text-muted-foreground">
                    <StageIcon type={item.icon_type as IconType} size={16} />
                    <span>{item.label || iconInfo?.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}