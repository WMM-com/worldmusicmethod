import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ArtistMetrics {
  artistId: string;
  artistName: string;
  artistImage?: string;
  // Monthly revenue
  monthlyPlayCredits: number;
  platformTotalCredits: number;
  artistPercentage: number;
  revenuePoolAmount: number;
  artistPaymentAmount: number;
  paymentPerCredit: number;
  // Performance metrics
  songPlays: number;
  podcastPlays: number;
  uniqueListeners: number;
  lastMonthCredits: number;
  monthOverMonthGrowth: number;
  // Lifetime stats
  lifetimeCredits: number;
  lifetimeEarnings: number;
}

export interface TrackPerformance {
  id: string;
  title: string;
  contentType: 'song' | 'podcast_episode';
  playCredits: number;
  playCount: number;
  coverImageUrl?: string;
}

export interface MonthlyData {
  month: string;
  credits: number;
}

export function useArtistDashboard(artistId?: string) {
  const { user } = useAuth();

  // Get user's artist access
  const { data: artistAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['artist-dashboard-access', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_dashboard_access')
        .select('artist_id, media_artists(id, name, image_url)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedArtistId = artistId || artistAccess?.[0]?.artist_id;

  // Get current month's metrics
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Get artist monthly credits
  const { data: artistMonthlyCredits } = useQuery({
    queryKey: ['artist-monthly-credits', selectedArtistId, currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('*')
        .eq('artist_id', selectedArtistId!)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArtistId,
  });

  // Get last month's credits for comparison
  const { data: lastMonthCredits } = useQuery({
    queryKey: ['artist-last-month-credits', selectedArtistId, lastMonthYear, lastMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('total_play_credits')
        .eq('artist_id', selectedArtistId!)
        .eq('year', lastMonthYear)
        .eq('month', lastMonth)
        .maybeSingle();
      if (error) throw error;
      return data?.total_play_credits || 0;
    },
    enabled: !!selectedArtistId,
  });

  // Get platform total credits for this month
  const { data: platformCredits } = useQuery({
    queryKey: ['platform-monthly-credits', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('total_play_credits')
        .eq('year', currentYear)
        .eq('month', currentMonth);
      if (error) throw error;
      return data?.reduce((sum, row) => sum + Number(row.total_play_credits), 0) || 0;
    },
    enabled: !!selectedArtistId,
  });

  // Get revenue pool settings
  const { data: revenuePool } = useQuery({
    queryKey: ['revenue-pool', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_pool_settings')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArtistId,
  });

  // Get artist info
  const { data: artistInfo } = useQuery({
    queryKey: ['artist-info', selectedArtistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_artists')
        .select('id, name, image_url')
        .eq('id', selectedArtistId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArtistId,
  });

  // Get artist's tracks with play counts
  const { data: artistTracks } = useQuery({
    queryKey: ['artist-tracks-performance', selectedArtistId],
    queryFn: async () => {
      // Get all tracks by this artist
      const { data: tracks, error: tracksError } = await supabase
        .from('media_tracks')
        .select('id, title, content_type, cover_image_url')
        .eq('artist_id', selectedArtistId!)
        .eq('is_published', true);
      if (tracksError) throw tracksError;

      // Get play credits for each track this month
      const { data: playEvents, error: playsError } = await supabase
        .from('play_events')
        .select('content_id, play_credits')
        .in('content_id', tracks?.map(t => t.id) || [])
        .gte('created_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);
      if (playsError) throw playsError;

      // Aggregate by track
      const trackStats = tracks?.map(track => {
        const trackPlays = playEvents?.filter(p => p.content_id === track.id) || [];
        const playCredits = trackPlays.reduce((sum, p) => sum + Number(p.play_credits), 0);
        const playCount = trackPlays.length;
        return {
          id: track.id,
          title: track.title,
          contentType: track.content_type as 'song' | 'podcast_episode',
          playCredits,
          playCount,
          coverImageUrl: track.cover_image_url,
        };
      }) || [];

      // Sort by credits earned
      return trackStats.sort((a, b) => b.playCredits - a.playCredits);
    },
    enabled: !!selectedArtistId,
  });

  // Get lifetime credits
  const { data: lifetimeStats } = useQuery({
    queryKey: ['artist-lifetime-credits', selectedArtistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('total_play_credits, year, month')
        .eq('artist_id', selectedArtistId!);
      if (error) throw error;
      
      const lifetimeCredits = data?.reduce((sum, row) => sum + Number(row.total_play_credits), 0) || 0;
      return { lifetimeCredits, history: data || [] };
    },
    enabled: !!selectedArtistId,
  });

  // Get last 6 months data for chart
  const { data: chartData } = useQuery({
    queryKey: ['artist-chart-data', selectedArtistId],
    queryFn: async () => {
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        const monthData = lifetimeStats?.history.find(
          h => h.year === year && h.month === month
        );
        
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          credits: monthData ? Number(monthData.total_play_credits) : 0,
        });
      }
      return months;
    },
    enabled: !!lifetimeStats,
  });

  // Calculate all metrics
  const monthlyCredits = Number(artistMonthlyCredits?.total_play_credits || 0);
  const platformTotal = platformCredits || 0;
  const poolAmount = Number(revenuePool?.pool_amount || 0);
  const percentage = platformTotal > 0 ? (monthlyCredits / platformTotal) * 100 : 0;
  const paymentAmount = poolAmount * (percentage / 100);
  const paymentPerCredit = platformTotal > 0 ? poolAmount / platformTotal : 0;
  const previousCredits = lastMonthCredits || 0;
  const growth = previousCredits > 0 
    ? ((monthlyCredits - previousCredits) / previousCredits) * 100 
    : monthlyCredits > 0 ? 100 : 0;

  const metrics: ArtistMetrics | null = artistInfo ? {
    artistId: artistInfo.id,
    artistName: artistInfo.name,
    artistImage: artistInfo.image_url || undefined,
    monthlyPlayCredits: monthlyCredits,
    platformTotalCredits: platformTotal,
    artistPercentage: percentage,
    revenuePoolAmount: poolAmount,
    artistPaymentAmount: paymentAmount,
    paymentPerCredit: paymentPerCredit,
    songPlays: artistMonthlyCredits?.song_plays || 0,
    podcastPlays: artistMonthlyCredits?.podcast_plays || 0,
    uniqueListeners: artistMonthlyCredits?.unique_listeners || 0,
    lastMonthCredits: previousCredits,
    monthOverMonthGrowth: growth,
    lifetimeCredits: lifetimeStats?.lifetimeCredits || 0,
    lifetimeEarnings: 0, // Would need historical revenue pool data
  } : null;

  return {
    artistAccess,
    selectedArtistId,
    metrics,
    topTracks: artistTracks?.slice(0, 5) || [],
    allTracks: artistTracks || [],
    chartData: chartData || [],
    revenuePool,
    isLoading: accessLoading,
    hasAccess: (artistAccess?.length || 0) > 0,
    currency: revenuePool?.currency || 'GBP',
  };
}

// Hook for admin to manage artist dashboard access
export function useArtistDashboardAdmin() {
  // Get all artists
  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ['admin-all-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_artists')
        .select('id, name, image_url')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Get all access grants
  const { data: allAccess, isLoading: accessLoading, refetch: refetchAccess } = useQuery({
    queryKey: ['admin-artist-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_dashboard_access')
        .select('*, media_artists(name, image_url)');
      if (error) throw error;
      return data;
    },
  });

  return {
    artists,
    allAccess,
    isLoading: artistsLoading || accessLoading,
    refetchAccess,
  };
}
