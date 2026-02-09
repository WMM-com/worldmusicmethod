import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLayoutClass } from './GridLayout';
import { LayoutSelector } from './LayoutSelector';
import { LayoutType } from './GridLayout';

interface SortableSectionProps {
  id: string;
  layout?: string | null;
  isEditing: boolean;
  children: React.ReactNode;
  onLayoutChange?: (layout: LayoutType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function SortableSectionComponent({ 
  id, 
  layout, 
  isEditing, 
  children, 
  onLayoutChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
}: SortableSectionProps) {
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
        <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Move Up Button */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className={cn(
              'p-1 rounded-t-md bg-background border border-border border-b-0 shadow-sm',
              'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
              isFirst && 'opacity-40 cursor-not-allowed'
            )}
            aria-label="Move section up"
          >
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          </button>
          
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'p-1.5 bg-background border-x border-border shadow-sm',
              'cursor-grab active:cursor-grabbing',
              'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary'
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          
          {/* Move Down Button */}
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className={cn(
              'p-1 bg-background border-x border-border shadow-sm',
              'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
              isLast && 'opacity-40 cursor-not-allowed'
            )}
            aria-label="Move section down"
          >
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          
          {/* Delete Button */}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'p-1 rounded-b-md bg-background border border-border border-t-0 shadow-sm',
                'hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive'
              )}
              aria-label="Delete section"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          )}
          
          {/* Layout Selector */}
          {onLayoutChange && (
            <div className="mt-1">
              <LayoutSelector 
                currentLayout={layout || null} 
                onLayoutChange={onLayoutChange} 
              />
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// Named export for compatibility
export const SortableSection = SortableSectionComponent;
