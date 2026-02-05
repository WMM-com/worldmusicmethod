import { cn } from '@/lib/utils';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { ReactNode } from 'react';

// Maps layout values to Tailwind 12-column grid classes
const layoutClasses: Record<string, string> = {
  // Full width
  'full': 'col-span-12',
  
  // Half widths (6 cols each)
  'half-left': 'col-span-12 md:col-span-6',
  'half-right': 'col-span-12 md:col-span-6',
  
  // Thirds (4 cols each)
  'third-left': 'col-span-12 md:col-span-4',
  'third-center': 'col-span-12 md:col-span-4',
  'third-right': 'col-span-12 md:col-span-4',
  
  // Two-thirds + One-third combinations (8 + 4 cols)
  'two-thirds-left': 'col-span-12 md:col-span-8',
  'one-third-right': 'col-span-12 md:col-span-4',
  'one-third-left': 'col-span-12 md:col-span-4',
  'two-thirds-right': 'col-span-12 md:col-span-8',
  
  // Three-quarters + Quarter combinations (9 + 3 cols)
  'three-quarter-left': 'col-span-12 md:col-span-9',
  'quarter-right': 'col-span-12 md:col-span-3',
  'quarter-left': 'col-span-12 md:col-span-3',
  'three-quarter-right': 'col-span-12 md:col-span-9',
  
  // Complex row layouts (half + quarter + quarter = 6 + 3 + 3)
  'half-first': 'col-span-12 md:col-span-6',
  'quarter-second': 'col-span-6 md:col-span-3',
  'quarter-third': 'col-span-6 md:col-span-3',
  
  // Complex row layouts (quarter + quarter + half = 3 + 3 + 6)
  'quarter-first': 'col-span-6 md:col-span-3',
  'quarter-second-alt': 'col-span-6 md:col-span-3',
  'half-third': 'col-span-12 md:col-span-6',
};

export type LayoutType = keyof typeof layoutClasses;

export function getLayoutClass(layout: string | null | undefined): string {
  return layoutClasses[layout || 'full'] || layoutClasses['full'];
}

interface GridLayoutProps {
  sections: ProfileSection[];
  renderSection: (section: ProfileSection) => ReactNode;
  className?: string;
}

export function GridLayout({ sections, renderSection, className }: GridLayoutProps) {
  // Sort sections by order_index
  const sortedSections = [...sections]
    .filter(s => s.is_visible)
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className={cn('grid grid-cols-12 gap-4', className)}>
      {sortedSections.map((section) => (
        <div
          key={section.id}
          className={cn(getLayoutClass(section.layout))}
        >
          {renderSection(section)}
        </div>
      ))}
    </div>
  );
}

// Export layout options for use in UI selectors
export const layoutOptions: { value: LayoutType; label: string; description: string }[] = [
  { value: 'full', label: 'Full Width', description: '12 columns' },
  { value: 'half-left', label: 'Half (Left)', description: '6 columns' },
  { value: 'half-right', label: 'Half (Right)', description: '6 columns' },
  { value: 'third-left', label: 'Third (Left)', description: '4 columns' },
  { value: 'third-center', label: 'Third (Center)', description: '4 columns' },
  { value: 'third-right', label: 'Third (Right)', description: '4 columns' },
  { value: 'two-thirds-left', label: 'Two Thirds (Left)', description: '8 columns' },
  { value: 'one-third-right', label: 'One Third (Right)', description: '4 columns' },
  { value: 'one-third-left', label: 'One Third (Left)', description: '4 columns' },
  { value: 'two-thirds-right', label: 'Two Thirds (Right)', description: '8 columns' },
  { value: 'three-quarter-left', label: 'Three Quarters (Left)', description: '9 columns' },
  { value: 'quarter-right', label: 'Quarter (Right)', description: '3 columns' },
  { value: 'quarter-left', label: 'Quarter (Left)', description: '3 columns' },
  { value: 'three-quarter-right', label: 'Three Quarters (Right)', description: '9 columns' },
  { value: 'half-first', label: 'Half (First)', description: '6 columns in row' },
  { value: 'quarter-second', label: 'Quarter (Second)', description: '3 columns in row' },
  { value: 'quarter-third', label: 'Quarter (Third)', description: '3 columns in row' },
  { value: 'quarter-first', label: 'Quarter (First)', description: '3 columns in row' },
  { value: 'quarter-second-alt', label: 'Quarter (Second Alt)', description: '3 columns in row' },
  { value: 'half-third', label: 'Half (Third)', description: '6 columns in row' },
];
