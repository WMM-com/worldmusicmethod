import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import type { PinnedAudio } from '@/types/groups';

interface PinnedAudioPlayerProps {
  audio: PinnedAudio;
  compact?: boolean;
}

export function PinnedAudioPlayer({ audio, compact = false }: PinnedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.volume = newMuted ? 0 : volume;
    setIsMuted(newMuted);
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
        <audio ref={audioRef} src={audio.audio_url} preload="metadata" />
        
        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
          {audio.cover_image_url ? (
            <img src={audio.cover_image_url} alt="" className="h-full w-full object-cover rounded" />
          ) : (
            <Music className="h-5 w-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{audio.title}</p>
          {audio.artist && <p className="text-xs text-muted-foreground truncate">{audio.artist}</p>}
        </div>
        
        <Button variant="ghost" size="sm" onClick={togglePlay} className="h-8 w-8 p-0">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <audio ref={audioRef} src={audio.audio_url} preload="metadata" />
        
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {audio.cover_image_url ? (
              <img src={audio.cover_image_url} alt="" className="h-full w-full object-cover rounded-lg" />
            ) : (
              <Music className="h-8 w-8 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{audio.title}</h4>
            {audio.artist && <p className="text-sm text-muted-foreground truncate">{audio.artist}</p>}
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(duration)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
            <Button variant="outline" size="sm" onClick={togglePlay} className="h-10 w-10 p-0 rounded-full">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
