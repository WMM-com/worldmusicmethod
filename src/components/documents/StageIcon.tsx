import { IconType } from '@/types/techSpec';
import { 
  Guitar, 
  Piano, 
  Mic, 
  Speaker, 
  Music, 
  Laptop,
  Volume2,
  Circle
} from 'lucide-react';

interface StageIconProps {
  type: IconType;
  size?: number;
  className?: string;
}

export function StageIcon({ type, size = 24, className }: StageIconProps) {
  const iconProps = { size, className };

  // Return appropriate icon based on type
  switch (type) {
    case 'guitar':
    case 'bass':
      return <Guitar {...iconProps} />;
    
    case 'keyboard':
    case 'piano':
      return <Piano {...iconProps} />;
    
    case 'drums':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <ellipse cx="12" cy="8" rx="9" ry="4" />
          <path d="M3 8v8c0 2.2 4 4 9 4s9-1.8 9-4V8" />
          <path d="M3 12c0 2.2 4 4 9 4s9-1.8 9-4" />
        </svg>
      );
    
    case 'percussion':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="4" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="20" />
        </svg>
      );
    
    case 'monitor':
      return <Speaker {...iconProps} />;
    
    case 'mic_tall':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      );
    
    case 'mic_short':
      return <Mic {...iconProps} />;
    
    case 'di_box':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="8" width="18" height="8" rx="1" />
          <circle cx="7" cy="12" r="1" />
          <circle cx="17" cy="12" r="1" />
          <line x1="10" y1="10" x2="10" y2="14" />
          <line x1="14" y1="10" x2="14" y2="14" />
        </svg>
      );
    
    case 'amp_guitar':
    case 'amp_bass':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <line x1="8" y1="7" x2="8" y2="7" />
          <line x1="12" y1="7" x2="12" y2="7" />
          <line x1="16" y1="7" x2="16" y2="7" />
        </svg>
      );
    
    case 'subwoofer':
      return <Volume2 {...iconProps} />;
    
    case 'violin':
    case 'cello':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2v4" />
          <ellipse cx="12" cy="10" rx="3" ry="4" />
          <ellipse cx="12" cy="18" rx="4" ry="4" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      );
    
    case 'saxophone':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 4c0 1.5.5 3 2 4l8 8c1.5 1.5 2 4 2 6" />
          <circle cx="17" cy="19" r="2" />
          <path d="M8 8c2-1 4-1 6 0" />
        </svg>
      );
    
    case 'trumpet':
    case 'trombone':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 12h12" />
          <path d="M16 8v8" />
          <ellipse cx="20" cy="12" rx="2" ry="4" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="10" cy="12" r="2" />
        </svg>
      );
    
    case 'laptop':
      return <Laptop {...iconProps} />;
    
    case 'mixer':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <line x1="6" y1="10" x2="6" y2="14" />
          <line x1="10" y1="9" x2="10" y2="15" />
          <line x1="14" y1="10" x2="14" y2="14" />
          <line x1="18" y1="11" x2="18" y2="13" />
        </svg>
      );
    
    default:
      return <Music {...iconProps} />;
  }
}
