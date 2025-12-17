import { IconType, STAGE_ICONS } from '@/types/techSpec';

interface StageIconProps {
  type: IconType;
  size?: number;
  className?: string;
}

export function StageIcon({ type, size = 24, className }: StageIconProps) {
  const iconInfo = STAGE_ICONS.find(i => i.type === type);
  const sizeMultiplier = iconInfo?.size === 'lg' ? 1.4 : iconInfo?.size === 'sm' ? 0.8 : 1;
  const actualSize = size * sizeMultiplier;
  
  const svgProps = {
    width: actualSize,
    height: actualSize,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (type) {
    // Electric Guitar - solid body, 6 tuning pegs
    case 'electric_guitar':
      return (
        <svg {...svgProps}>
          <path d="M12 8l2-4h3l2 4" />
          <line x1="13" y1="4" x2="13" y2="8" />
          <line x1="15" y1="4" x2="15" y2="8" />
          <line x1="18" y1="4" x2="18" y2="8" />
          <rect x="13" y="8" width="6" height="4" rx="1" />
          <line x1="16" y1="12" x2="16" y2="28" />
          <ellipse cx="16" cy="36" rx="10" ry="8" />
          <circle cx="12" cy="36" r="2" />
          <circle cx="20" cy="36" r="2" />
          <rect x="14" y="30" width="4" height="4" rx="0.5" />
        </svg>
      );

    // Acoustic Guitar - hollow body with sound hole, 6 tuning pegs
    case 'acoustic_guitar':
      return (
        <svg {...svgProps}>
          <path d="M12 8l2-4h3l2 4" />
          <line x1="13" y1="4" x2="13" y2="8" />
          <line x1="15" y1="4" x2="15" y2="8" />
          <line x1="18" y1="4" x2="18" y2="8" />
          <rect x="13" y="8" width="6" height="4" rx="1" />
          <line x1="16" y1="12" x2="16" y2="26" />
          <ellipse cx="16" cy="26" rx="6" ry="5" />
          <ellipse cx="16" cy="38" rx="10" ry="8" />
          <circle cx="16" cy="35" r="4" />
          <line x1="16" y1="39" x2="16" y2="44" />
        </svg>
      );

    // Classical Guitar - wider neck, 6 tuning pegs (3 each side)
    case 'classical_guitar':
      return (
        <svg {...svgProps}>
          <rect x="11" y="4" width="10" height="5" rx="1" />
          <circle cx="12" cy="6" r="1" />
          <circle cx="12" cy="8" r="1" />
          <circle cx="20" cy="6" r="1" />
          <circle cx="20" cy="8" r="1" />
          <rect x="14" y="9" width="4" height="3" rx="0.5" />
          <line x1="16" y1="12" x2="16" y2="26" />
          <ellipse cx="16" cy="26" rx="6" ry="5" />
          <ellipse cx="16" cy="38" rx="10" ry="8" />
          <circle cx="16" cy="35" r="5" />
          <line x1="16" y1="40" x2="16" y2="44" />
        </svg>
      );

    // Bass Guitar - 4 tuning pegs, longer neck
    case 'bass_guitar':
      return (
        <svg {...svgProps}>
          <path d="M14 6l1-3h2l1 3" />
          <line x1="14.5" y1="3" x2="14.5" y2="6" />
          <line x1="17.5" y1="3" x2="17.5" y2="6" />
          <rect x="14" y="6" width="4" height="3" rx="1" />
          <line x1="16" y1="9" x2="16" y2="30" />
          <path d="M8 38c0-6 4-10 8-10s8 4 8 10c0 4-3 7-8 7s-8-3-8-7z" />
          <circle cx="12" cy="38" r="2" />
          <circle cx="20" cy="38" r="2" />
        </svg>
      );

    // Keyboard
    case 'keyboard':
      return (
        <svg {...svgProps}>
          <rect x="4" y="16" width="40" height="16" rx="2" />
          <line x1="10" y1="16" x2="10" y2="32" />
          <line x1="16" y1="16" x2="16" y2="32" />
          <line x1="22" y1="16" x2="22" y2="32" />
          <line x1="28" y1="16" x2="28" y2="32" />
          <line x1="34" y1="16" x2="34" y2="32" />
          <line x1="40" y1="16" x2="40" y2="32" />
          <rect x="8" y="16" width="3" height="9" fill="currentColor" />
          <rect x="14" y="16" width="3" height="9" fill="currentColor" />
          <rect x="26" y="16" width="3" height="9" fill="currentColor" />
          <rect x="32" y="16" width="3" height="9" fill="currentColor" />
          <rect x="38" y="16" width="3" height="9" fill="currentColor" />
        </svg>
      );

    // Grand Piano
    case 'piano':
      return (
        <svg {...svgProps}>
          <path d="M6 12h36l-4 28H10L6 12z" />
          <path d="M6 12c0-2 2-4 4-4h28c2 0 4 2 4 4" />
          <line x1="8" y1="40" x2="6" y2="46" />
          <line x1="40" y1="40" x2="42" y2="46" />
          <line x1="24" y1="40" x2="24" y2="44" />
          <rect x="10" y="16" width="28" height="8" rx="1" />
        </svg>
      );

    // Synthesizer
    case 'synth':
      return (
        <svg {...svgProps}>
          <rect x="4" y="14" width="40" height="20" rx="2" />
          <rect x="6" y="26" width="36" height="6" rx="1" />
          <circle cx="10" cy="19" r="2" />
          <circle cx="18" cy="19" r="2" />
          <circle cx="26" cy="19" r="2" />
          <rect x="32" y="17" width="8" height="4" rx="1" />
          <line x1="8" y1="26" x2="8" y2="32" />
          <line x1="14" y1="26" x2="14" y2="32" />
          <line x1="20" y1="26" x2="20" y2="32" />
          <line x1="26" y1="26" x2="26" y2="32" />
          <line x1="32" y1="26" x2="32" y2="32" />
          <line x1="38" y1="26" x2="38" y2="32" />
        </svg>
      );

    // Drum Kit - top-down view showing snare, kick, hi-hat, toms, cymbals
    case 'drums':
      return (
        <svg {...svgProps}>
          {/* Kick drum */}
          <ellipse cx="24" cy="36" rx="10" ry="6" />
          {/* Snare */}
          <ellipse cx="14" cy="26" rx="6" ry="4" />
          {/* Hi-hat */}
          <ellipse cx="6" cy="18" rx="4" ry="2" />
          <ellipse cx="6" cy="16" rx="4" ry="2" />
          {/* Floor tom */}
          <ellipse cx="36" cy="28" rx="6" ry="4" />
          {/* Rack tom 1 */}
          <ellipse cx="18" cy="14" rx="5" ry="3" />
          {/* Rack tom 2 */}
          <ellipse cx="30" cy="14" rx="5" ry="3" />
          {/* Crash cymbal */}
          <ellipse cx="10" cy="8" rx="5" ry="2" />
          {/* Ride cymbal */}
          <ellipse cx="40" cy="12" rx="6" ry="2" />
        </svg>
      );

    // Generic percussion
    case 'percussion':
      return (
        <svg {...svgProps}>
          <ellipse cx="24" cy="30" rx="12" ry="6" />
          <path d="M12 30v-8c0-6 5-10 12-10s12 4 12 10v8" />
          <line x1="12" y1="22" x2="36" y2="22" />
        </svg>
      );

    // Congas
    case 'congas':
      return (
        <svg {...svgProps}>
          <ellipse cx="16" cy="12" rx="8" ry="4" />
          <path d="M8 12v24c0 4 3 8 8 8s8-4 8-8V12" />
          <ellipse cx="34" cy="14" rx="7" ry="3" />
          <path d="M27 14v22c0 3 2.5 7 7 7s7-4 7-7V14" />
        </svg>
      );

    // Bongos
    case 'bongos':
      return (
        <svg {...svgProps}>
          <ellipse cx="14" cy="18" rx="8" ry="4" />
          <path d="M6 18v14c0 3 3 6 8 6s8-3 8-6V18" />
          <ellipse cx="34" cy="20" rx="6" ry="3" />
          <path d="M28 20v12c0 2 2.5 5 6 5s6-3 6-5V20" />
          <rect x="20" y="22" width="10" height="4" rx="1" />
        </svg>
      );

    // Cajón
    case 'cajon':
      return (
        <svg {...svgProps}>
          <rect x="10" y="8" width="28" height="36" rx="2" />
          <circle cx="24" cy="38" r="3" />
          <line x1="14" y1="12" x2="34" y2="12" />
        </svg>
      );

    // Timpani
    case 'timpani':
      return (
        <svg {...svgProps}>
          <ellipse cx="24" cy="16" rx="16" ry="6" />
          <path d="M8 16v16c0 6 7 10 16 10s16-4 16-10V16" />
          <ellipse cx="24" cy="16" rx="12" ry="4" />
          <line x1="6" y1="42" x2="10" y2="46" />
          <line x1="42" y1="42" x2="38" y2="46" />
        </svg>
      );

    // Violin
    case 'violin':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="4" x2="24" y2="12" />
          <rect x="22" y="4" width="4" height="3" rx="1" />
          <ellipse cx="24" cy="16" rx="6" ry="4" />
          <path d="M18 20c-2 2-4 6-4 10 0 6 4 10 10 10s10-4 10-10c0-4-2-8-4-10" />
          <ellipse cx="24" cy="32" rx="4" ry="6" />
          <line x1="21" y1="26" x2="27" y2="26" />
          <circle cx="20" cy="32" r="1" />
          <circle cx="28" cy="32" r="1" />
        </svg>
      );

    // Viola (slightly larger than violin)
    case 'viola':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="4" x2="24" y2="10" />
          <rect x="22" y="4" width="4" height="3" rx="1" />
          <ellipse cx="24" cy="14" rx="7" ry="4" />
          <path d="M17 18c-3 2-5 7-5 12 0 6 5 12 12 12s12-6 12-12c0-5-2-10-5-12" />
          <ellipse cx="24" cy="32" rx="5" ry="7" />
          <line x1="20" y1="25" x2="28" y2="25" />
          <circle cx="19" cy="32" r="1.5" />
          <circle cx="29" cy="32" r="1.5" />
        </svg>
      );

    // Cello
    case 'cello':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="2" x2="24" y2="8" />
          <rect x="21" y="2" width="6" height="4" rx="1" />
          <ellipse cx="24" cy="12" rx="8" ry="4" />
          <path d="M16 16c-4 3-6 8-6 14 0 8 6 14 14 14s14-6 14-14c0-6-2-11-6-14" />
          <ellipse cx="24" cy="34" rx="6" ry="8" />
          <line x1="19" y1="24" x2="29" y2="24" />
          <circle cx="18" cy="34" r="2" />
          <circle cx="30" cy="34" r="2" />
          <line x1="24" y1="42" x2="24" y2="46" />
        </svg>
      );

    // Double Bass
    case 'double_bass':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="2" x2="24" y2="6" />
          <rect x="20" y="2" width="8" height="4" rx="1" />
          <ellipse cx="24" cy="10" rx="10" ry="4" />
          <path d="M14 14c-4 4-8 10-8 18 0 10 8 14 18 14s18-4 18-14c0-8-4-14-8-18" />
          <ellipse cx="24" cy="34" rx="8" ry="10" />
          <line x1="17" y1="22" x2="31" y2="22" />
          <circle cx="16" cy="34" r="2" />
          <circle cx="32" cy="34" r="2" />
          <line x1="24" y1="44" x2="24" y2="48" />
        </svg>
      );

    // Harp
    case 'harp':
      return (
        <svg {...svgProps}>
          <path d="M10 44c0-20 4-36 14-40" />
          <path d="M10 44h20c4 0 8-2 8-6V8" />
          <line x1="12" y1="8" x2="12" y2="40" />
          <line x1="16" y1="6" x2="16" y2="42" />
          <line x1="20" y1="5" x2="20" y2="43" />
          <line x1="24" y1="4" x2="24" y2="44" />
          <line x1="28" y1="6" x2="28" y2="44" />
          <line x1="32" y1="8" x2="32" y2="43" />
          <ellipse cx="14" cy="44" rx="6" ry="2" />
        </svg>
      );

    // Trumpet - detailed with valves and bell
    case 'trumpet':
      return (
        <svg {...svgProps}>
          <path d="M4 24h8" />
          <rect x="12" y="20" width="4" height="8" rx="1" />
          <path d="M16 24h4" />
          <circle cx="22" cy="18" r="2" />
          <circle cx="26" cy="18" r="2" />
          <circle cx="30" cy="18" r="2" />
          <rect x="20" y="20" width="12" height="8" rx="1" />
          <path d="M32 24h4" />
          <path d="M36 24c6 0 8 4 8 0s-2-8-8-8" />
          <path d="M36 24c6 0 8-4 8 0s-2 8-8 8" />
        </svg>
      );

    // Trombone - with slide
    case 'trombone':
      return (
        <svg {...svgProps}>
          <path d="M4 20h30" />
          <path d="M4 28h30" />
          <path d="M4 20v8" />
          <path d="M34 16c8 0 10 8 10 8s-2 8-10 8" />
          <rect x="30" y="18" width="4" height="12" rx="1" />
          <path d="M8 28v8h4v-8" />
          <ellipse cx="10" cy="38" rx="4" ry="2" />
        </svg>
      );

    // French Horn - circular with bell
    case 'french_horn':
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="24" r="14" />
          <circle cx="24" cy="24" r="10" />
          <circle cx="24" cy="24" r="6" />
          <path d="M10 24c-4 0-6 4-6 4s2 4 6 4" />
          <circle cx="18" cy="16" r="2" />
          <circle cx="24" cy="14" r="2" />
          <circle cx="30" cy="16" r="2" />
        </svg>
      );

    // Tuba - large with valves
    case 'tuba':
      return (
        <svg {...svgProps}>
          <ellipse cx="24" cy="38" rx="14" ry="8" />
          <path d="M10 38V18c0-8 6-14 14-14s14 6 14 14v20" />
          <circle cx="18" cy="20" r="2" />
          <circle cx="24" cy="18" r="2" />
          <circle cx="30" cy="20" r="2" />
          <ellipse cx="24" cy="38" rx="10" ry="5" />
        </svg>
      );

    // Flugelhorn
    case 'flugelhorn':
      return (
        <svg {...svgProps}>
          <path d="M4 24h6" />
          <rect x="10" y="20" width="4" height="8" rx="1" />
          <path d="M14 24h4" />
          <circle cx="20" cy="18" r="2" />
          <circle cx="24" cy="18" r="2" />
          <circle cx="28" cy="18" r="2" />
          <rect x="18" y="20" width="12" height="8" rx="1" />
          <path d="M30 24h4" />
          <path d="M34 16c10 0 12 8 12 8s-2 8-12 8" />
        </svg>
      );

    // Saxophone - detailed with keys
    case 'saxophone':
      return (
        <svg {...svgProps}>
          <path d="M14 4l4 2v8" />
          <ellipse cx="18" cy="16" rx="4" ry="3" />
          <path d="M18 19c0 8-2 14 6 22" />
          <ellipse cx="28" cy="42" rx="8" ry="4" />
          <circle cx="14" cy="20" r="1.5" />
          <circle cx="16" cy="24" r="1.5" />
          <circle cx="18" cy="28" r="1.5" />
          <circle cx="20" cy="32" r="1.5" />
          <circle cx="22" cy="36" r="1.5" />
        </svg>
      );

    // Clarinet
    case 'clarinet':
      return (
        <svg {...svgProps}>
          <rect x="22" y="4" width="4" height="6" rx="1" />
          <rect x="21" y="10" width="6" height="28" rx="1" />
          <ellipse cx="24" cy="42" rx="5" ry="4" />
          <circle cx="20" cy="16" r="1" />
          <circle cx="20" cy="22" r="1" />
          <circle cx="20" cy="28" r="1" />
          <circle cx="28" cy="19" r="1" />
          <circle cx="28" cy="25" r="1" />
          <circle cx="28" cy="31" r="1" />
        </svg>
      );

    // Flute
    case 'flute':
      return (
        <svg {...svgProps}>
          <rect x="4" y="22" width="40" height="4" rx="2" />
          <ellipse cx="8" cy="24" rx="2" ry="3" />
          <circle cx="14" cy="24" r="1.5" />
          <circle cx="20" cy="24" r="1.5" />
          <circle cx="26" cy="24" r="1.5" />
          <circle cx="32" cy="24" r="1.5" />
          <circle cx="38" cy="24" r="1.5" />
        </svg>
      );

    // Oboe
    case 'oboe':
      return (
        <svg {...svgProps}>
          <path d="M22 4h4l1 4h-6l1-4z" />
          <rect x="21" y="8" width="6" height="30" rx="1" />
          <ellipse cx="24" cy="42" rx="6" ry="4" />
          <circle cx="20" cy="14" r="1" />
          <circle cx="20" cy="20" r="1" />
          <circle cx="20" cy="26" r="1" />
          <circle cx="20" cy="32" r="1" />
          <circle cx="28" cy="17" r="1" />
          <circle cx="28" cy="23" r="1" />
          <circle cx="28" cy="29" r="1" />
        </svg>
      );

    // Bassoon
    case 'bassoon':
      return (
        <svg {...svgProps}>
          <path d="M16 4c-2 2-4 6-4 10v28" />
          <path d="M32 4c2 2 4 6 4 10v24" />
          <rect x="12" y="38" width="8" height="6" rx="2" />
          <rect x="28" y="34" width="8" height="6" rx="2" />
          <path d="M20 42h8" />
          <circle cx="14" cy="18" r="1" />
          <circle cx="14" cy="26" r="1" />
          <circle cx="34" cy="18" r="1" />
          <circle cx="34" cy="26" r="1" />
        </svg>
      );

    // Monitor Wedge - angled shape
    case 'monitor':
      return (
        <svg {...svgProps}>
          <path d="M6 38l6-22h24l6 22H6z" />
          <ellipse cx="24" cy="26" rx="8" ry="6" />
          <ellipse cx="24" cy="26" rx="3" ry="2" />
          <line x1="10" y1="36" x2="38" y2="36" />
        </svg>
      );

    // Mic on Boom Stand - tall with angled boom
    case 'mic_tall':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="46" x2="24" y2="20" />
          <line x1="18" y1="46" x2="30" y2="46" />
          <line x1="24" y1="20" x2="34" y2="10" />
          <ellipse cx="36" cy="8" rx="4" ry="6" />
          <circle cx="20" cy="44" r="2" />
          <circle cx="28" cy="44" r="2" />
          <rect x="22" y="18" width="4" height="6" rx="1" />
        </svg>
      );

    // Mic on Short Stand - straight up
    case 'mic_short':
      return (
        <svg {...svgProps}>
          <line x1="24" y1="46" x2="24" y2="24" />
          <line x1="18" y1="46" x2="30" y2="46" />
          <ellipse cx="24" cy="18" rx="4" ry="8" />
          <rect x="22" y="22" width="4" height="4" rx="1" />
          <circle cx="20" cy="44" r="2" />
          <circle cx="28" cy="44" r="2" />
        </svg>
      );

    // DI Box
    case 'di_box':
      return (
        <svg {...svgProps}>
          <rect x="8" y="16" width="32" height="16" rx="2" />
          <circle cx="16" cy="24" r="3" />
          <circle cx="32" cy="24" r="3" />
          <line x1="22" y1="20" x2="22" y2="28" />
          <line x1="26" y1="20" x2="26" y2="28" />
          <text x="24" y="14" fontSize="6" textAnchor="middle" fill="currentColor" stroke="none">DI</text>
        </svg>
      );

    // Guitar Amp - smaller combo style
    case 'amp_guitar':
      return (
        <svg {...svgProps}>
          <rect x="8" y="10" width="32" height="32" rx="3" />
          <circle cx="24" cy="30" r="10" />
          <circle cx="24" cy="30" r="6" />
          <circle cx="14" cy="16" r="2" />
          <circle cx="20" cy="16" r="2" />
          <circle cx="26" cy="16" r="2" />
          <circle cx="32" cy="16" r="2" />
          <line x1="12" y1="20" x2="36" y2="20" />
        </svg>
      );

    // Bass Amp - larger with multiple speakers
    case 'amp_bass':
      return (
        <svg {...svgProps}>
          <rect x="6" y="6" width="36" height="40" rx="3" />
          <circle cx="18" cy="30" r="8" />
          <circle cx="30" cy="30" r="8" />
          <circle cx="18" cy="30" r="4" />
          <circle cx="30" cy="30" r="4" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="24" cy="12" r="2" />
          <circle cx="30" cy="12" r="2" />
          <circle cx="36" cy="12" r="2" />
          <line x1="10" y1="18" x2="38" y2="18" />
        </svg>
      );

    // Subwoofer
    case 'subwoofer':
      return (
        <svg {...svgProps}>
          <rect x="8" y="8" width="32" height="32" rx="3" />
          <circle cx="24" cy="24" r="12" />
          <circle cx="24" cy="24" r="8" />
          <circle cx="24" cy="24" r="4" />
        </svg>
      );

    // IEM Pack
    case 'iem':
      return (
        <svg {...svgProps}>
          <rect x="14" y="12" width="20" height="28" rx="2" />
          <rect x="18" y="16" width="12" height="6" rx="1" />
          <circle cx="20" cy="30" r="2" />
          <circle cx="28" cy="30" r="2" />
          <path d="M22 36h4" />
          <line x1="24" y1="8" x2="24" y2="12" />
          <circle cx="24" cy="6" r="2" />
        </svg>
      );

    // Laptop
    case 'laptop':
      return (
        <svg {...svgProps}>
          <rect x="8" y="12" width="32" height="20" rx="2" />
          <rect x="10" y="14" width="28" height="16" rx="1" />
          <path d="M4 32h40l-4 8H8l-4-8z" />
          <rect x="20" y="34" width="8" height="2" rx="0.5" />
        </svg>
      );

    // Mixer
    case 'mixer':
      return (
        <svg {...svgProps}>
          <rect x="4" y="12" width="40" height="24" rx="2" />
          <line x1="10" y1="18" x2="10" y2="30" />
          <line x1="16" y1="16" x2="16" y2="32" />
          <line x1="22" y1="18" x2="22" y2="30" />
          <line x1="28" y1="16" x2="28" y2="32" />
          <line x1="34" y1="18" x2="34" y2="30" />
          <line x1="40" y1="20" x2="40" y2="28" />
          <circle cx="10" cy="22" r="1.5" fill="currentColor" />
          <circle cx="16" cy="26" r="1.5" fill="currentColor" />
          <circle cx="22" cy="20" r="1.5" fill="currentColor" />
          <circle cx="28" cy="24" r="1.5" fill="currentColor" />
          <circle cx="34" cy="22" r="1.5" fill="currentColor" />
        </svg>
      );

    // Music Stand
    case 'music_stand':
      return (
        <svg {...svgProps}>
          <rect x="10" y="8" width="28" height="20" rx="1" />
          <line x1="24" y1="28" x2="24" y2="44" />
          <line x1="16" y1="44" x2="32" y2="44" />
          <line x1="24" y1="44" x2="18" y2="46" />
          <line x1="24" y1="44" x2="30" y2="46" />
          <line x1="14" y1="14" x2="34" y2="14" />
          <line x1="14" y1="18" x2="34" y2="18" />
          <line x1="14" y1="22" x2="34" y2="22" />
        </svg>
      );

    // Person standing
    case 'person_standing':
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="10" r="6" />
          <line x1="24" y1="16" x2="24" y2="32" />
          <line x1="24" y1="20" x2="14" y2="28" />
          <line x1="24" y1="20" x2="34" y2="28" />
          <line x1="24" y1="32" x2="16" y2="44" />
          <line x1="24" y1="32" x2="32" y2="44" />
        </svg>
      );

    // Person seated
    case 'person_seated':
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="10" r="6" />
          <line x1="24" y1="16" x2="24" y2="28" />
          <line x1="24" y1="20" x2="14" y2="26" />
          <line x1="24" y1="20" x2="34" y2="26" />
          <line x1="24" y1="28" x2="14" y2="32" />
          <line x1="14" y1="32" x2="10" y2="44" />
          <line x1="24" y1="28" x2="34" y2="32" />
          <line x1="34" y1="32" x2="38" y2="44" />
          <rect x="8" y="30" width="32" height="4" rx="1" />
        </svg>
      );

    default:
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="24" r="16" />
          <text x="24" y="28" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none">?</text>
        </svg>
      );
  }
}
