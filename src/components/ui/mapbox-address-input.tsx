import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface MapboxAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface MapboxSuggestion {
  id: string;
  place_name: string;
  text: string;
}

export function MapboxAddressInput({ 
  value, 
  onChange, 
  placeholder = "Start typing an address...",
  className,
  disabled 
}: MapboxAddressInputProps) {
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3 || !hasUserTyped) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mapbox-geocode', {
        body: { query }
      });
      
      if (error) {
        console.error('Mapbox geocode error:', error);
        return;
      }
      
      if (data?.features) {
        setSuggestions(data.features.map((f: any) => ({
          id: f.id,
          place_name: f.place_name,
          text: f.text,
        })));
        if (isFocused && hasUserTyped) {
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isFocused, hasUserTyped]);

  useEffect(() => {
    if (!hasUserTyped) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, fetchSuggestions, hasUserTyped]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: MapboxSuggestion) => {
    onChange(suggestion.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setHasUserTyped(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasUserTyped(true);
    onChange(e.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Only show suggestions if user has typed and there are suggestions
    if (hasUserTyped && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(isLoading && "pr-8", className)}
        disabled={disabled}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-md last:rounded-b-md"
            >
              {suggestion.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}