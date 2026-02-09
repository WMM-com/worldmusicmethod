import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Settings, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLayoutClass } from './GridLayout';
import { LayoutSelector } from './LayoutSelector';
import { LayoutType } from './GridLayout';
import { BreakpointStyleEditor, ResponsiveStyles, resolveResponsiveStyles, useScreenWidth } from './BreakpointStyleEditor';
import { DeviceType } from './DevicePreviewToggle';

interface SortableSectionProps {
  id: string;
  layout?: string | null;
  isEditing: boolean;
  children: React.ReactNode;
  sectionType?: string;
  sectionTitle?: string;
  responsiveStyles?: ResponsiveStyles;
  activeBreakpoint?: DeviceType;
  onLayoutChange?: (layout: LayoutType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onStyleChange?: (styles: ResponsiveStyles) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function SortableSectionComponent({ 
  id, 
  layout, 
  isEditing, 
  children, 
  sectionType = 'text_block',
  sectionTitle = 'Section',
  responsiveStyles,
  activeBreakpoint = 'desktop',
  onLayoutChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onStyleChange,
  isFirst,
  isLast,
}: SortableSectionProps) {
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const screenWidth = useScreenWidth();

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

  // Resolve responsive styles based on current screen width
  const resolvedStyles = resolveResponsiveStyles(responsiveStyles, screenWidth);
  const hasCustomStyles = responsiveStyles && Object.keys(responsiveStyles).some(
    k => responsiveStyles[k as DeviceType] && Object.keys(responsiveStyles[k as DeviceType]!).length > 0
  );

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...resolvedStyles }}
      className={cn(
        getLayoutClass(layout),
        isDragging && 'opacity-50 z-50',
        'relative group'
      )}
    >
      {isEditing && (
        <>
          {/* Left sidebar controls */}
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

            {/* Style Settings Button */}
            {onStyleChange && (
              <button
                type="button"
                onClick={() => setStyleEditorOpen(true)}
                className={cn(
                  'p-1 bg-background border-x border-border shadow-sm',
                  'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
                  hasCustomStyles && 'text-primary'
                )}
                aria-label="Style settings"
                title="Responsive style settings"
              >
                <Settings className={cn('h-3 w-3', hasCustomStyles ? 'text-primary' : 'text-muted-foreground')} />
              </button>
            )}
            
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
          </div>

          {/* Top-right Layout Selector - offset left to avoid section's own controls */}
          {onLayoutChange && (
            <div className="absolute top-2 right-14 z-10">
              <LayoutSelector 
                currentLayout={layout || null} 
                onLayoutChange={onLayoutChange} 
              />
            </div>
          )}
        </>
      )}
      {children}

      {/* Style Editor Modal */}
      {onStyleChange && (
        <BreakpointStyleEditor
          open={styleEditorOpen}
          onOpenChange={setStyleEditorOpen}
          sectionType={sectionType}
          sectionTitle={sectionTitle}
          currentStyles={responsiveStyles || {}}
          onSave={onStyleChange}
          activeBreakpoint={activeBreakpoint}
        />
      )}
    </div>
  );
}

// Named export for compatibility
export const SortableSection = SortableSectionComponent;
