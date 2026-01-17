import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListMusic, Play, Pause, ChevronRight } from 'lucide-react';
import { useCommunityFeedPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { PlaylistCoverGrid } from '@/components/media/PlaylistCoverGrid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

const PLAYLIST_SHOWN_KEY = 'community_playlist_shown';

export function MobilePlaylistDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const isDragging = useRef(false);
  
  const { data: playlist, isLoading } = useCommunityFeedPlaylist();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useMediaPlayer();

  // List of community pages where the drawer should appear
  const isCommunityPage = ['/social', '/community', '/community/groups'].some(path => 
    location.pathname === path || location.pathname.startsWith('/community/groups/')
  );

  // Auto-open on first visit to community pages, then close after 4 seconds
  useEffect(() => {
    if (isLoading || !playlist || !isCommunityPage) return;
    
    // Check if this is the first visit to community pages in this session
    const hasBeenShown = sessionStorage.getItem(PLAYLIST_SHOWN_KEY);
    
    if (!hasBeenShown) {
      // Open immediately on page load
      setIsOpen(true);
      sessionStorage.setItem(PLAYLIST_SHOWN_KEY, 'true');
      
      // Auto-close after 4 seconds if user hasn't interacted
      const closeTimer = setTimeout(() => {
        if (!hasInteracted) {
          setIsOpen(false);
        }
      }, 4000);
      
      return () => clearTimeout(closeTimer);
    }
  }, [isLoading, playlist, isCommunityPage, hasInteracted]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasInteracted(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handlePlayPlaylist = () => {
    setHasInteracted(true);
    if (playlist?.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handlePlayTrack = (track: any, index: number) => {
    setHasInteracted(true);
    if (playlist?.tracks) {
      playTrack(track, playlist.tracks.slice(index));
    }
  };

  const isTrackPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const isCurrentTrack = (trackId: string) => {
    return currentTrack?.id === trackId;
  };

  // Handle swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    // Swipe left to close (threshold of 50px)
    if (diff > 50) {
      handleClose();
    }
  };

  // Don't render if not on a community page or no playlist
  if (isLoading || !playlist || !isCommunityPage) return null;

  const coverUrls = playlist.tracks?.slice(0, 4).map(t => t.cover_image_url) || [];

  return (
    <>
      {/* Toggle Button - always visible on mobile when drawer is closed, swipeable from edge */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: 0, right: 150 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDrag={(_, info) => {
              isDragging.current = true;
              // Calculate progress (0 to 1) based on drag distance
              const progress = Math.min(info.offset.x / 100, 1);
              setDragProgress(progress);
            }}
            onDragEnd={(_, info) => {
              isDragging.current = false;
              // If swiped right more than 50px, open the drawer
              if (info.offset.x > 50 || info.velocity.x > 300) {
                handleOpen();
              }
              setDragProgress(0);
            }}
            onClick={handleOpen}
            className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-primary text-primary-foreground p-3 rounded-r-lg shadow-lg flex items-center gap-2 cursor-grab active:cursor-grabbing touch-pan-x"
          >
            <ListMusic className="h-5 w-5" />
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progressive drawer preview - shows FULL content as you drag */}
      <AnimatePresence>
        {!isOpen && dragProgress > 0 && (
          <>
            {/* Backdrop that fades in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: dragProgress * 0.5 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black z-35"
              style={{ pointerEvents: 'none' }}
            />
            
            {/* Full drawer that slides in during drag */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: `${-100 + (dragProgress * 100)}%` }}
              exit={{ x: '-100%' }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-card border-r border-border z-40 overflow-hidden flex flex-col pointer-events-none"
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <ListMusic className="h-4 w-4" />
                  Community Playlist
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Swipe left to close</p>
              </div>
              
              {/* Playlist Cover */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <PlaylistCoverGrid coverUrls={coverUrls} size="lg" className="w-full aspect-square max-w-[200px] mx-auto" />
                </div>
                <h3 className="font-semibold mt-3 text-center">{playlist.name}</h3>
                {playlist.description && (
                  <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1">{playlist.description}</p>
                )}
              </div>
              
              {/* Track List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {playlist.tracks?.map((track, index) => (
                    <div
                      key={track.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md",
                        isCurrentTrack(track.id) 
                          ? "bg-primary/10" 
                          : ""
                      )}
                    >
                      {/* Track Number */}
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {isTrackPlaying(track.id) ? (
                          <Pause className="h-4 w-4 text-primary" />
                        ) : isCurrentTrack(track.id) ? (
                          <Play className="h-4 w-4 text-primary ml-0.5" />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Track Cover */}
                      <div className="h-10 w-10 rounded overflow-hidden shrink-0 bg-muted">
                        {track.cover_image_url ? (
                          <img 
                            src={track.cover_image_url} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ListMusic className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          isCurrentTrack(track.id) ? "text-primary font-medium" : ""
                        )}>
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Footer */}
              <div className="p-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  {playlist.tracks?.length || 0} tracks
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={handleClose}
            />
            
            {/* Drawer */}
            <motion.aside
              ref={drawerRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 180, mass: 1.2 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.3, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100 || info.velocity.x < -500) {
                  handleClose();
                } else {
                  setHasInteracted(true);
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-card border-r border-border z-50 overflow-hidden touch-pan-y flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
              
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <ListMusic className="h-4 w-4" />
                  Community Playlist
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Swipe left to close</p>
              </div>
              
              {/* Playlist Cover */}
              <div className="p-4 border-b border-border">
                <div 
                  className="cursor-pointer group"
                  onClick={() => {
                    handleClose();
                    navigate(`/listen/playlist/${playlist.id}`);
                  }}
                >
                  <div className="relative">
                    <PlaylistCoverGrid coverUrls={coverUrls} size="lg" className="w-full aspect-square max-w-[200px] mx-auto" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg max-w-[200px] mx-auto">
                      <Button 
                        size="icon" 
                        variant="default"
                        className="h-12 w-12 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist();
                        }}
                      >
                        <Play className="h-6 w-6 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold mt-3 text-center">{playlist.name}</h3>
                  {playlist.description && (
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1">{playlist.description}</p>
                  )}
                </div>
              </div>
              
              {/* Track List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {playlist.tracks?.map((track, index) => (
                    <div
                      key={track.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors group/track",
                        isCurrentTrack(track.id) 
                          ? "bg-primary/10" 
                          : "hover:bg-accent/50"
                      )}
                      onClick={() => {
                        if (isCurrentTrack(track.id)) {
                          togglePlay();
                        } else {
                          handlePlayTrack(track, index);
                        }
                      }}
                    >
                      {/* Track Number / Play Button */}
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {isTrackPlaying(track.id) ? (
                          <Pause className="h-4 w-4 text-primary" />
                        ) : isCurrentTrack(track.id) ? (
                          <Play className="h-4 w-4 text-primary ml-0.5" />
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground group-hover/track:hidden">
                              {index + 1}
                            </span>
                            <Play className="h-4 w-4 hidden group-hover/track:block ml-0.5" />
                          </>
                        )}
                      </div>

                      {/* Track Cover */}
                      <div className="h-10 w-10 rounded overflow-hidden shrink-0 bg-muted">
                        {track.cover_image_url ? (
                          <img 
                            src={track.cover_image_url} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ListMusic className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          isCurrentTrack(track.id) ? "text-primary font-medium" : ""
                        )}>
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Footer */}
              <div className="p-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  {playlist.tracks?.length || 0} tracks
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
