import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  RefreshCw,
  Search,
  Music,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface R2File {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

interface R2BrowseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, key: string) => void;
  questionLabel?: string;
}

export function R2BrowseModal({ open, onOpenChange, onSelect, questionLabel }: R2BrowseModalProps) {
  const [r2Files, setR2Files] = useState<R2File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prefix, setPrefix] = useState('2024/08/');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load files when modal opens
  useEffect(() => {
    if (open && r2Files.length === 0) {
      loadFiles();
    }
  }, [open]);

  // Stop audio when modal closes
  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    }
  }, [open]);

  const loadFiles = async (p?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-test-audio', {
        body: { action: 'list', prefix: p ?? prefix },
      });
      if (error) throw error;
      setR2Files(data.files || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to list R2 files');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = (url: string) => {
    if (!audioRef.current) return;
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => toast.error('Playback failed'));
      setPlayingUrl(url);
    }
  };

  const handleSelect = (file: R2File) => {
    audioRef.current?.pause();
    setPlayingUrl(null);
    onSelect(file.url, file.key);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            R2 Media Browser
            {questionLabel && (
              <Badge variant="secondary" className="ml-2 text-xs">{questionLabel}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Browse and select an audio file from R2 storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Prefix e.g. 2024/08/"
              className="flex-1"
            />
            <Button onClick={() => loadFiles(prefix)} disabled={isLoading} size="icon">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {['2024/08/', '2024/07/', ''].map((p) => (
              <Button
                key={p || 'all'}
                variant="outline"
                size="sm"
                onClick={() => { setPrefix(p); loadFiles(p); }}
              >
                {p || 'All files'}
              </Button>
            ))}
          </div>

          {/* File list */}
          <ScrollArea className="h-[350px] border rounded-lg">
            {r2Files.length === 0 && !isLoading ? (
              <p className="text-center text-muted-foreground py-8">
                No audio files found. Try a different prefix.
              </p>
            ) : (
              <div className="space-y-1 p-2">
                {r2Files.map((file) => (
                  <div
                    key={file.key}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors'
                    )}
                    onClick={() => handleSelect(file)}
                  >
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-mono">{file.key}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => { e.stopPropagation(); togglePlay(file.url); }}
                    >
                      {playingUrl === file.url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="text-xs text-muted-foreground">{r2Files.length} file(s)</div>
        </div>

        <audio
          ref={audioRef}
          onEnded={() => setPlayingUrl(null)}
          onError={() => setPlayingUrl(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
