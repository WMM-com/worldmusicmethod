import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DevicePreviewToggleProps {
  device: DeviceType;
  onChange: (device: DeviceType) => void;
  className?: string;
  autoDetect?: boolean;
}

const deviceConfig: Record<DeviceType, { label: string; icon: typeof Smartphone; width: number }> = {
  mobile: { label: 'Mobile', icon: Smartphone, width: 375 },
  tablet: { label: 'Tablet', icon: Tablet, width: 768 },
  desktop: { label: 'Desktop', icon: Monitor, width: 1440 },
};

// Detect device type from screen width
export function detectDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function DevicePreviewToggle({ device, onChange, className, autoDetect = true }: DevicePreviewToggleProps) {
  const hasAutoDetected = useRef(false);

  // Auto-detect on first mount based on current screen width
  useEffect(() => {
    if (autoDetect && !hasAutoDetected.current) {
      hasAutoDetected.current = true;
      const detected = detectDeviceType(window.innerWidth);
      if (detected !== device) {
        onChange(detected);
      }
    }
  }, [autoDetect]); // Only on mount

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted shrink-0', className)}>
      {(Object.keys(deviceConfig) as DeviceType[]).map((d) => {
        const { label, icon: Icon, width } = deviceConfig[d];
        const isActive = device === d;
        
        return (
          <Button
            key={d}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(d)}
            className={cn(
              'gap-1.5 h-8 px-2',
              isActive && 'shadow-sm'
            )}
            title={`${label} (${width}px)`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// Returns max-width constraint for the preview container
export function getDeviceMaxWidth(device: DeviceType): string | undefined {
  switch (device) {
    case 'mobile': return '375px';
    case 'tablet': return '768px';
    case 'desktop': 
    default: return undefined;
  }
}
