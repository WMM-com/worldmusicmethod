import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, Music, ListMusic } from 'lucide-react';
import { usePlaylistByName, type MediaTrack } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';

interface CommunityPlaylistPlayerProps {
  playlistName: string;
}

export function CommunityPlaylistPlayer({ playlistName }: CommunityPlaylistPlayerProps) {
  const { data: playlist, isLoading } = usePlaylistByName(playlistName);
  const { currentTrack, isPlaying, playTrack, pause, resume } = useMediaPlayer();

  const handlePlayTrack = (track: MediaTrack) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else if (playlist?.tracks) {
      playTrack(track, playlist.tracks);
    }
  };

  const handlePlayAll = () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!playlist) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListMusic className="h-4 w-4" />
            Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Playlist not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListMusic className="h-4 w-4" />
            {playlist.name}
          </CardTitle>
          {playlist.tracks && playlist.tracks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handlePlayAll}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
        {playlist.description && (
          <p className="text-xs text-muted-foreground">{playlist.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="px-4 pb-4 space-y-1">
            {playlist.tracks?.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isCurrentlyPlaying = isCurrentTrack && isPlaying;

              return (
                <button
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left ${
                    isCurrentTrack ? 'bg-muted' : ''
                  }`}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0 relative">
                    {track.cover_image_url ? (
                      <img
                        src={track.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <Music className="h-4 w-4 text-muted-foreground" />
                    )}
                    {isCurrentTrack && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                        {isCurrentlyPlaying ? (
                          <Pause className="h-3 w-3 text-white" />
                        ) : (
                          <Play className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isCurrentTrack ? 'font-medium text-primary' : ''}`}>
                      {track.title}
                    </p>
                    {track.artist && (
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist.name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
            {(!playlist.tracks || playlist.tracks.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tracks in this playlist
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
