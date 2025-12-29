import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchTracks } from '@/hooks/useMedia';
import { TrackList } from './TrackList';

interface MediaSearchProps {
  onSearch?: (query: string) => void;
}

export function MediaSearch({ onSearch }: MediaSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: results, isLoading } = useSearchTracks(debouncedQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      onSearch?.(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search songs, artists, albums, podcasts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {debouncedQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {isLoading ? 'Searching...' : `Results for "${debouncedQuery}"`}
          </h3>
          {results && <TrackList tracks={results} />}
        </div>
      )}
    </div>
  );
}
