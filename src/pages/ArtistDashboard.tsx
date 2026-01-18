import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArtistDashboard } from '@/hooks/useArtistDashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, TrendingDown, Music, Mic, Users, 
  DollarSign, Calendar, BarChart3, Play, Clock, Percent
} from 'lucide-react';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip
} from 'recharts';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function ArtistDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedArtistId, setSelectedArtistId] = useState<string>();
  
  const {
    artistAccess,
    metrics,
    topTracks,
    allTracks,
    chartData,
    isLoading,
    hasAccess,
    currency,
  } = useArtistDashboard(selectedArtistId);

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <AppLayout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Artist Dashboard Access Required</h2>
              <p className="text-muted-foreground">
                You don't have access to any artist dashboards. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextPaymentDate = new Date();
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  nextPaymentDate.setDate(5); // Payment on 5th of each month

  return (
    <AppLayout>
      <div className="container py-6 space-y-6 max-w-7xl">
        {/* Header with Artist Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {metrics?.artistImage && (
              <img 
                src={metrics.artistImage} 
                alt={metrics.artistName}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{metrics?.artistName || 'Artist Dashboard'}</h1>
              <p className="text-muted-foreground">Your streaming performance & earnings</p>
            </div>
          </div>
          
          {artistAccess && artistAccess.length > 1 && (
            <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select artist" />
              </SelectTrigger>
              <SelectContent>
                {artistAccess.map((access: any) => (
                  <SelectItem key={access.artist_id} value={access.artist_id}>
                    {access.media_artists?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue="this-month" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="this-month">This Month</TabsTrigger>
            <TabsTrigger value="all-time">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="this-month" className="space-y-6">
            {/* Main Revenue Card - Multi-Currency */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  {currentMonth} Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Multi-currency earnings display */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {(metrics?.artistPaymentGBP || 0) > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border">
                      <p className="text-sm text-muted-foreground mb-1">GBP Earnings</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {formatCurrency(metrics?.artistPaymentGBP || 0, 'GBP')}
                      </p>
                    </div>
                  )}
                  {(metrics?.artistPaymentUSD || 0) > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border">
                      <p className="text-sm text-muted-foreground mb-1">USD Earnings</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {formatCurrency(metrics?.artistPaymentUSD || 0, 'USD')}
                      </p>
                    </div>
                  )}
                  {(metrics?.artistPaymentEUR || 0) > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border">
                      <p className="text-sm text-muted-foreground mb-1">EUR Earnings</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {formatCurrency(metrics?.artistPaymentEUR || 0, 'EUR')}
                      </p>
                    </div>
                  )}
                  {/* Fallback if no multi-currency configured */}
                  {(metrics?.artistPaymentGBP || 0) === 0 && 
                   (metrics?.artistPaymentUSD || 0) === 0 && 
                   (metrics?.artistPaymentEUR || 0) === 0 && (
                    <div className="col-span-full bg-background/50 rounded-lg p-4 border">
                      <p className="text-sm text-muted-foreground mb-1">Estimated Earnings</p>
                      <p className="text-3xl sm:text-4xl font-bold text-primary">
                        {formatCurrency(metrics?.artistPaymentAmount || 0, currency)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Your Credits</p>
                    <p className="font-semibold text-lg">{metrics?.monthlyPlayCredits.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Platform Total</p>
                    <p className="font-semibold text-lg">{metrics?.platformTotalCredits.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your Share</p>
                    <p className="font-semibold text-lg">{metrics?.artistPercentage.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate/Credit</p>
                    <p className="font-semibold text-lg">{formatCurrency(metrics?.paymentPerCredit || 0, currency)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Song Plays</p>
                      <p className="text-2xl font-bold">{metrics?.songPlays || 0}</p>
                    </div>
                    <Music className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">1.0 credit each</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Podcast Plays</p>
                      <p className="text-2xl font-bold">{metrics?.podcastPlays || 0}</p>
                    </div>
                    <Mic className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">0.5 credits each</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unique Listeners</p>
                      <p className="text-2xl font-bold">{metrics?.uniqueListeners || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">vs Last Month</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        {metrics?.monthOverMonthGrowth !== undefined && (
                          <>
                            {metrics.monthOverMonthGrowth >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                            {Math.abs(metrics.monthOverMonthGrowth).toFixed(1)}%
                          </>
                        )}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart & Top Tracks */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Credits Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Play Credits (6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="credits" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Content</CardTitle>
                  <CardDescription>By credits earned this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {topTracks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No plays recorded this month yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topTracks.map((track, index) => (
                        <div key={track.id} className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          {track.coverImageUrl ? (
                            <img 
                              src={track.coverImageUrl} 
                              alt={track.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              {track.contentType === 'song' ? (
                                <Music className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <Mic className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{track.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {track.playCount} plays • {track.playCredits.toFixed(1)} credits
                            </p>
                          </div>
                          <Badge variant={track.contentType === 'song' ? 'default' : 'secondary'}>
                            {track.contentType === 'song' ? 'Song' : 'Podcast'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Next Payment Date</p>
                      <p className="text-sm text-muted-foreground">
                        {nextPaymentDate.toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">Revenue Pool</p>
                    <div className="flex flex-col sm:items-end gap-1 text-sm">
                      {(metrics?.revenuePoolGBP || 0) > 0 && (
                        <span className="font-medium">£{metrics?.revenuePoolGBP.toFixed(2)} GBP</span>
                      )}
                      {(metrics?.revenuePoolUSD || 0) > 0 && (
                        <span className="font-medium">${metrics?.revenuePoolUSD.toFixed(2)} USD</span>
                      )}
                      {(metrics?.revenuePoolEUR || 0) > 0 && (
                        <span className="font-medium">€{metrics?.revenuePoolEUR.toFixed(2)} EUR</span>
                      )}
                      {(metrics?.revenuePoolGBP || 0) === 0 && 
                       (metrics?.revenuePoolUSD || 0) === 0 && 
                       (metrics?.revenuePoolEUR || 0) === 0 && (
                        <span className="text-muted-foreground">Not yet configured</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-time" className="space-y-6">
            {/* Lifetime Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Play className="h-10 w-10 mx-auto text-primary/60 mb-3" />
                    <p className="text-sm text-muted-foreground">Lifetime Play Credits</p>
                    <p className="text-3xl font-bold">{metrics?.lifetimeCredits.toFixed(1)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Music className="h-10 w-10 mx-auto text-primary/60 mb-3" />
                    <p className="text-sm text-muted-foreground">Total Tracks</p>
                    <p className="text-3xl font-bold">{allTracks.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Percent className="h-10 w-10 mx-auto text-primary/60 mb-3" />
                    <p className="text-sm text-muted-foreground">Current Share</p>
                    <p className="text-3xl font-bold">{metrics?.artistPercentage.toFixed(2)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Content Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Content Performance</CardTitle>
                <CardDescription>Lifetime statistics for all your content</CardDescription>
              </CardHeader>
              <CardContent>
                {allTracks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No content found
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {allTracks.map((track) => (
                      <div key={track.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {track.coverImageUrl ? (
                          <img 
                            src={track.coverImageUrl} 
                            alt={track.title}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            {track.contentType === 'song' ? (
                              <Music className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Mic className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.title}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {track.playCount} plays
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {track.playCredits.toFixed(1)} credits
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={track.contentType === 'song' ? 'default' : 'secondary'}
                          className="flex-shrink-0"
                        >
                          {track.contentType === 'song' ? 'Song' : 'Podcast'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
