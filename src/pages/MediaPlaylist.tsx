import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, ListMusic, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaylist, useDeletePlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PlaylistCoverGrid } from '@/components/media/PlaylistCoverGrid';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlaylistTrackList } from '@/components/media/PlaylistTrackList';

export default function MediaPlaylist() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack } = useMediaPlayer();
  const { data: playlist, isLoading } = usePlaylist(playlistId || '');
  const deletePlaylist = useDeletePlaylist();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Only show delete option if user owns this playlist
  const canDelete = user && playlist?.user_id === user.id;

  useEffect(() => {
    if (playlist?.name) {
      document.title = `${playlist.name} | Music`;
    }
  }, [playlist?.name]);

  const handlePlayAll = () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShuffle = () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleDeletePlaylist = () => {
    if (!playlistId) return;
    
    deletePlaylist.mutate(playlistId, {
      onSuccess: () => {
        toast.success('Playlist deleted');
        navigate('/music');
      },
      onError: () => {
        toast.error('Failed to delete playlist');
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader />
        <div className="container py-8 pb-28 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-6">
            <Skeleton className="w-48 h-48 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!playlist) {
    return (
      <>
        <SiteHeader />
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Playlist not found</p>
          <Button variant="link" onClick={() => navigate('/music')}>
            Back to Music
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="container py-8 pb-28 space-y-8">
        <Button variant="ghost" onClick={() => navigate('/music')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Music
        </Button>

        {/* Playlist header */}
        <div className="flex flex-col md:flex-row items-start gap-6">
          {playlist.cover_image_url ? (
            <img 
              src={playlist.cover_image_url} 
              alt={playlist.name}
              className="w-48 h-48 rounded-lg object-cover shadow-lg"
            />
          ) : playlist.tracks && playlist.tracks.length > 0 ? (
            <div className="w-48 h-48 shadow-lg">
              <PlaylistCoverGrid 
                coverUrls={playlist.tracks.map(t => t.cover_image_url)} 
                size="lg"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center shadow-lg">
              <ListMusic className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          <div className="space-y-4 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Playlist</p>
                <h1 className="text-3xl font-bold">{playlist.name}</h1>
                {playlist.description && (
                  <p className="text-muted-foreground mt-2">{playlist.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {playlist.tracks?.length || 0} tracks
                </p>
              </div>
              
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePlayAll} disabled={!playlist.tracks?.length}>
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
              <Button variant="outline" onClick={handleShuffle} disabled={!playlist.tracks?.length}>
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        {playlist.tracks && playlist.tracks.length > 0 ? (
          <PlaylistTrackList 
            tracks={playlist.tracks} 
            playlistId={playlistId || ''} 
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListMusic className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This playlist is empty</p>
            <p className="text-sm">Add some tracks to get started</p>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePlaylist}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
