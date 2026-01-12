import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Instrument preset types for Soundslice embeds.
 * Each preset applies specific settings optimized for that instrument.
 * 
 * To change settings for ALL lessons of a type, just edit the preset below.
 */
export type SoundslicePreset = 
  | 'guitar'      // Guitar, bass, vocals
  | 'bass'        // Same as guitar
  | 'vocals'      // Same as guitar
  | 'flute'       // No fretboard, no transposition
  | 'drum'        // No transposition
  | 'backing'     // Backing tracks - minimal UI
  | 'default';    // Basic settings

/**
 * Preset configurations for each instrument type.
 * Edit these to change settings for ALL embeds using that preset.
 */
const SOUNDSLICE_PRESETS: Record<SoundslicePreset, Record<string, string | number>> = {
  // Guitar, Bass, Vocals - Side video layout with fretboard
  guitar: {
    enable_waveform: 0,
    force_side_video: 1,
    side_video_width: '60p',
    layout: 1,
    narrow_video_height: '50p',
  },
  bass: {
    enable_waveform: 0,
    force_side_video: 1,
    side_video_width: '60p',
    layout: 1,
    narrow_video_height: '50p',
  },
  vocals: {
    enable_waveform: 0,
    force_side_video: 1,
    side_video_width: '60p',
    layout: 1,
    narrow_video_height: '50p',
  },
  // Flute - No fretboard or transposition
  flute: {
    enable_waveform: 0,
    enable_fretboard: 0,
    enable_transposition: 0,
    force_side_video: 1,
    side_video_width: '60p',
    layout: 1,
    narrow_video_height: '50p',
  },
  // Drum - No transposition
  drum: {
    enable_waveform: 0,
    force_side_video: 1,
    side_video_width: '60p',
    layout: 1,
    narrow_video_height: '50p',
    enable_transposition: 0,
  },
  // Backing tracks - Minimal UI with settings panel
  backing: {
    enable_waveform: 0,
    enable_fretboard: 0,
    settings: 1,
  },
  // Default - basic embed
  default: {},
};

interface SoundsliceEmbedProps {
  /** The Soundslice slice ID or full embed URL */
  sliceIdOrUrl: string;
  /** Instrument preset to apply (determines default settings) */
  preset?: SoundslicePreset;
  /** Height of the embed in pixels */
  height?: number;
  /** Additional URL parameters (override preset settings) */
  params?: Record<string, string | number | boolean>;
  /** Custom CSS classes for the container */
  className?: string;
}

/**
 * Soundslice embed component with automatic user ID tracking and instrument presets.
 * 
 * Presets provide centralized settings for each instrument type.
 * To change all guitar lessons, just edit SOUNDSLICE_PRESETS.guitar above.
 * 
 * @see https://soundslice.com/help/en/embedding/basics/231/unique-user-counting
 */
export function SoundsliceEmbed({
  sliceIdOrUrl,
  preset = 'default',
  height = 500,
  params = {},
  className = ''
}: SoundsliceEmbedProps) {
  const { user } = useAuth();

  const embedUrl = useMemo(() => {
    // Determine if we have a full URL or just a slice ID
    let baseUrl: string;
    
    // Clean up the input - remove quotes, trailing slashes, whitespace
    const cleanedInput = sliceIdOrUrl.trim().replace(/^['"`]+|['"`]+$/g, '').replace(/\/+$/, '');
    
    if (cleanedInput.includes('soundslice.com')) {
      // Full URL provided - extract the slice path and build embed URL
      // Handle formats like: https://www.soundslice.com/slices/krXCc/ or with dash like Y-m2c
      const sliceMatch = cleanedInput.match(/soundslice\.com\/slices\/([a-zA-Z0-9_-]+)/);
      if (sliceMatch) {
        baseUrl = `https://www.soundslice.com/slices/${sliceMatch[1]}/embed`;
      } else {
        // Fallback - try to use as-is with /embed
        baseUrl = cleanedInput.replace(/\/?$/, '').replace(/\/embed\/?$/, '') + '/embed';
      }
    } else {
      // Just the slice ID provided (like "Y-m2c" or "krXCc")
      // Remove any trailing slash that might be there
      const sliceId = cleanedInput.replace(/\/+$/, '');
      baseUrl = `https://www.soundslice.com/slices/${sliceId}/embed`;
    }

    // Build URL parameters - start with preset, then override with custom params
    const presetParams = SOUNDSLICE_PRESETS[preset] || {};
    const urlParams = new URLSearchParams();
    
    // Apply preset parameters first
    Object.entries(presetParams).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });

    // Add user ID for unique user tracking (recommended by Soundslice)
    if (user?.id) {
      urlParams.set('u', user.id);
    }

    // Override with any custom parameters
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });

    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/?${queryString}` : `${baseUrl}/`;
  }, [sliceIdOrUrl, preset, user?.id, params]);

  return (
    <div className={`w-full max-w-full overflow-hidden rounded-2xl shadow-2xl bg-card border border-border ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allowFullScreen
        className="w-full max-w-full"
        style={{ maxWidth: '100%' }}
        title="Soundslice Music Player"
      />
    </div>
  );
}