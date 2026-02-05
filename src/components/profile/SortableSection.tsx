import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getLayoutClass } from './GridLayout';

interface SortableSectionProps {
  id: string;
  layout?: string | null;
  isEditing: boolean;
  children: ReactNode;
}

export function SortableSection({ id, layout, isEditing, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getLayoutClass(layout),
        isDragging && 'opacity-50 z-50',
        'relative group'
      )}
    >
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'absolute -left-2 top-1/2 -translate-y-1/2 z-10',
            'p-1.5 rounded-md bg-background border border-border shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'cursor-grab active:cursor-grabbing',
            'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary'
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {children}
    </div>
  );
}
