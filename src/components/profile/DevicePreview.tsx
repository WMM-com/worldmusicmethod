import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DevicePreviewProps {
  children: ReactNode;
  device?: DeviceType;
  className?: string;
}

const deviceDimensions: Record<DeviceType, { width: number; height: number }> = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const deviceLabels: Record<DeviceType, { label: string; icon: typeof Smartphone }> = {
  mobile: { label: 'Mobile', icon: Smartphone },
  tablet: { label: 'Tablet', icon: Tablet },
  desktop: { label: 'Desktop', icon: Monitor },
};

export function DevicePreview({ children, device: initialDevice = 'desktop', className }: DevicePreviewProps) {
  const [device, setDevice] = useState<DeviceType>(initialDevice);
  const { width, height } = deviceDimensions[device];

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Device Toggle Buttons */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
        {(Object.keys(deviceDimensions) as DeviceType[]).map((d) => {
          const { label, icon: Icon } = deviceLabels[d];
          const isActive = device === d;
          
          return (
            <Button
              key={d}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDevice(d)}
              className={cn(
                'gap-2 transition-all',
                isActive && 'shadow-sm'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        })}
      </div>

      {/* Dimension Label */}
      <p className="text-xs text-muted-foreground">
        {width} × {height}px
      </p>

      {/* Device Frame */}
      <div
        className={cn(
          'relative rounded-lg border border-border bg-background',
          'shadow-lg shadow-black/10 dark:shadow-black/30',
          'overflow-hidden transition-all duration-300 ease-in-out'
        )}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
        }}
      >
        {/* Device Bezel Effect */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none z-10',
            'rounded-lg ring-1 ring-inset ring-border/50'
          )}
        />

        {/* Scrollable Content Area */}
        <div
          className="w-full h-full overflow-auto"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {/* Content wrapper to maintain proper width context */}
          <div
            style={{
              width: `${width}px`,
              minHeight: `${height}px`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
