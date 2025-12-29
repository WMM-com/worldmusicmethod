import { MediaTrack } from '@/hooks/useMedia';
import { TrackCard } from './TrackCard';

interface TrackListProps {
  tracks: MediaTrack[];
  showArtist?: boolean;
  compact?: boolean;
}

export function TrackList({ tracks, showArtist = true, compact = false }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tracks found
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <div key={track.id} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-6 text-right">
              {index + 1}
            </span>
            <div className="flex-1">
              <TrackCard 
                track={track} 
                trackList={tracks}
                showArtist={showArtist} 
                compact 
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackCard 
          key={track.id} 
          track={track} 
          trackList={tracks}
          showArtist={showArtist}
        />
      ))}
    </div>
  );
}
