import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SoundsliceEmbedProps {
  /** The Soundslice slice ID or full embed URL */
  sliceIdOrUrl: string;
  /** Height of the embed in pixels */
  height?: number;
  /** Additional URL parameters */
  params?: Record<string, string | number | boolean>;
  /** Custom CSS classes for the container */
  className?: string;
}

/**
 * Soundslice embed component with automatic user ID tracking.
 * 
 * Passes the authenticated user's ID to Soundslice via the `u` parameter
 * for accurate unique user counting in their Licensing plan.
 * 
 * @see https://soundslice.com/help/en/embedding/basics/231/unique-user-counting
 */
export function SoundsliceEmbed({
  sliceIdOrUrl,
  height = 500,
  params = {},
  className = ''
}: SoundsliceEmbedProps) {
  const { user } = useAuth();

  const embedUrl = useMemo(() => {
    // Determine if we have a full URL or just a slice ID
    let baseUrl: string;
    
    if (sliceIdOrUrl.includes('soundslice.com')) {
      // Full URL provided - ensure it ends with /embed/
      baseUrl = sliceIdOrUrl.includes('/embed/') 
        ? sliceIdOrUrl.replace(/\/$/, '') // Remove trailing slash if present
        : sliceIdOrUrl.replace(/\/?$/, '/embed');
    } else {
      // Just the slice ID provided
      baseUrl = `https://www.soundslice.com/slices/${sliceIdOrUrl}/embed`;
    }

    // Build URL parameters
    const urlParams = new URLSearchParams();
    
    // Add user ID for unique user tracking (recommended by Soundslice)
    // Using the Supabase user ID which is unique and non-PII
    if (user?.id) {
      urlParams.set('u', user.id);
    }

    // Add any additional custom parameters
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });

    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/?${queryString}` : `${baseUrl}/`;
  }, [sliceIdOrUrl, user?.id, params]);

  return (
    <div className={`rounded-2xl overflow-hidden shadow-2xl bg-card ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allowFullScreen
        className="w-full"
        title="Soundslice Music Player"
      />
    </div>
  );
}
