import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TrackList } from '@/components/media/TrackList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Music } from 'lucide-react';
import { useTracks } from '@/hooks/useMedia';

export default function ArtistPage() {
  const { artistSlug } = useParams();
  const navigate = useNavigate();

  // Fetch artist by slug
  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ['artist', artistSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_artists')
        .select('*')
        .eq('slug', artistSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!artistSlug,
  });

  // Fetch all songs (we'll filter by artist)
  const { data: allTracks } = useTracks('song');

  // Filter tracks by artist
  const artistTracks = allTracks?.filter(track => track.artist_id === artist?.id) || [];

  if (artistLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen">
          <Skeleton className="h-64 w-full" />
          <div className="container py-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </>
    );
  }

  if (!artist) {
    return (
      <>
        <SiteHeader />
        <div className="container py-8">
          <Button variant="ghost" onClick={() => navigate('/listen')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listen
          </Button>
          <div className="text-center py-12">
            <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold">Artist Not Found</h1>
            <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen pb-28">
        {/* Cover Image Header */}
        <div className="relative h-64 md:h-80 lg:h-96 w-full overflow-hidden">
          {artist.cover_image_url ? (
            <img 
              src={artist.cover_image_url} 
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : artist.image_url ? (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <img 
                src={artist.image_url} 
                alt={artist.name}
                className="h-48 w-48 md:h-56 md:w-56 rounded-full object-cover border-4 border-background shadow-2xl"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Music className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/listen')} 
            className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm hover:bg-background/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Artist Info - Overlapping the cover */}
        <div className="container relative -mt-20 md:-mt-24">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Profile Image (if using cover image, show profile separately) */}
            {artist.cover_image_url && artist.image_url && (
              <img 
                src={artist.image_url} 
                alt={artist.name}
                className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-4 border-background shadow-xl flex-shrink-0"
              />
            )}
            
            <div className="flex-1 pt-4">
              <h1 className="text-3xl md:text-4xl font-bold">{artist.name}</h1>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {artist.country && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {artist.country}
                  </Badge>
                )}
                <Badge variant="outline">
                  {artistTracks.length} {artistTracks.length === 1 ? 'Track' : 'Tracks'}
                </Badge>
              </div>

              {artist.bio && (
                <p className="text-muted-foreground mt-4 max-w-2xl whitespace-pre-wrap">
                  {artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="container mt-8">
          <h2 className="text-xl font-semibold mb-4">Songs</h2>
          
          {artistTracks.length > 0 ? (
            <TrackList tracks={artistTracks} variant="list" />
          ) : (
            <div className="text-center py-12 border border-border rounded-lg">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tracks available yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
