import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Youtube, Edit2, Trash2, Check, X, Plus } from 'lucide-react';
import { ProfileSection } from '@/hooks/useProfilePortfolio';

interface YouTubeEmbedProps {
  section: ProfileSection;
  isEditing: boolean;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
  isSidebar?: boolean;
}

// Global registry to track all YouTube players for pausing
const youtubePlayerRegistry = new Map<string, HTMLIFrameElement>();

export function YouTubeEmbed({ section, isEditing, onUpdate, onDelete, isSidebar = false }: YouTubeEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [videos, setVideos] = useState<string[]>(section.content?.videos || []);
  const [newUrl, setNewUrl] = useState('');
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const playerIdsRef = useRef<string[]>([]);

  // Generate unique ID for each video
  const getPlayerId = (index: number) => `yt-player-${section.id}-${index}`;

  const getYouTubeEmbedUrl = (url: string, index: number) => {
    const playerId = getPlayerId(index);
    const origin = window.location.origin;
    
    // Extract video ID first
    let videoId = '';
    if (url.includes('youtube.com/embed/')) {
      const match = url.match(/embed\/([^?&#]+)/);
      videoId = match?.[1] || '';
    } else {
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      } else if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        videoId = url.trim();
      }
    }
    
    if (!videoId) return url;
    
    // Build URL with required params for postMessage API
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&widgetid=${playerId}`;
  };

  // Pause all other YouTube videos when one starts playing
  const pauseOtherVideos = useCallback((currentPlayerId: string) => {
    youtubePlayerRegistry.forEach((iframe, playerId) => {
      if (playerId !== currentPlayerId && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
            'https://www.youtube.com'
          );
        } catch (e) {
          // Ignore cross-origin errors
        }
      }
    });
    
    // Pause the sticky audio player
    window.dispatchEvent(new CustomEvent('pause-audio-player'));
  }, []);

  // Register iframes when they load
  const handleIframeLoad = useCallback((iframe: HTMLIFrameElement | null, index: number) => {
    if (!iframe) return;
    
    const playerId = getPlayerId(index);
    youtubePlayerRegistry.set(playerId, iframe);
    playerIdsRef.current[index] = playerId;
    
    // Listen for ready event and subscribe to state changes
    try {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: playerId }),
        'https://www.youtube.com'
      );
    } catch (e) {
      // Ignore cross-origin errors
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerIdsRef.current.forEach(playerId => {
        youtubePlayerRegistry.delete(playerId);
      });
    };
  }, []);

  // Listen for YouTube state changes via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from YouTube
      if (!event.origin.includes('youtube.com')) return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // YouTube sends info object with playerState - 1 means playing
        if (data.info && data.info.playerState === 1) {
          // Find which player is playing by checking source window
          for (let i = 0; i < iframeRefs.current.length; i++) {
            const iframe = iframeRefs.current[i];
            if (iframe?.contentWindow === event.source) {
              const playerId = getPlayerId(i);
              pauseOtherVideos(playerId);
              break;
            }
          }
        }
      } catch {
        // Not a JSON message or not from YouTube
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pauseOtherVideos]);

  const handleAddVideo = () => {
    if (newUrl) {
      setVideos([...videos, newUrl]);
      setNewUrl('');
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate({ videos });
    setEditing(false);
  };

  if (!section.content?.videos?.length && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          {section.title || 'Videos'}
        </CardTitle>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {videos.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={url} readOnly className="flex-1" />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleRemoveVideo(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddVideo}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={isSidebar ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
            {section.content?.videos?.map((url: string, index: number) => (
              <div key={index} className="aspect-video">
                <iframe
                  ref={(el) => { iframeRefs.current[index] = el; }}
                  src={getYouTubeEmbedUrl(url, index)}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="rounded-lg"
                  onLoad={(e) => handleIframeLoad(e.currentTarget, index)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
