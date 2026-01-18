import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useArtistDashboardAdmin } from '@/hooks/useArtistDashboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Music, X } from 'lucide-react';

interface ArtistDashboardAccessDialogProps {
  user: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAccess: { artist_id: string; media_artists: { name: string } | null }[];
}

export function ArtistDashboardAccessDialog({
  user,
  open,
  onOpenChange,
  currentAccess,
}: ArtistDashboardAccessDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { artists, isLoading } = useArtistDashboardAdmin();

  const currentArtistIds = currentAccess.map(a => a.artist_id);

  const addAccessMutation = useMutation({
    mutationFn: async (artistId: string) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('artist_dashboard_access').insert({
        user_id: user!.id,
        artist_id: artistId,
        granted_by: currentUser?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-artist-access'] });
      toast.success('Artist dashboard access granted');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('User already has access to this artist');
      } else {
        toast.error(error.message || 'Failed to grant access');
      }
    },
  });

  const removeAccessMutation = useMutation({
    mutationFn: async (artistId: string) => {
      const { error } = await supabase
        .from('artist_dashboard_access')
        .delete()
        .eq('user_id', user!.id)
        .eq('artist_id', artistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-artist-access'] });
      toast.success('Artist dashboard access removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove access');
    },
  });

  const filteredArtists = artists?.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Artist Dashboard Access
          </DialogTitle>
          <DialogDescription>
            Grant or remove artist dashboard access for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {/* Current Access */}
        {currentAccess.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Access</Label>
            <div className="flex flex-wrap gap-2">
              {currentAccess.map((access) => (
                <Badge
                  key={access.artist_id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {access.media_artists?.name || 'Unknown Artist'}
                  <button
                    onClick={() => removeAccessMutation.mutate(access.artist_id)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    disabled={removeAccessMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search and Add */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading artists...</p>
              ) : filteredArtists.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No artists found</p>
              ) : (
                filteredArtists.map((artist) => {
                  const hasAccess = currentArtistIds.includes(artist.id);
                  return (
                    <div
                      key={artist.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => {
                        if (!hasAccess) {
                          addAccessMutation.mutate(artist.id);
                        }
                      }}
                    >
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 font-medium">{artist.name}</span>
                      {hasAccess ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Has Access
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={addAccessMutation.isPending}
                        >
                          Grant Access
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
