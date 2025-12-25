import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Music, Youtube, BookOpen, ListChecks, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface ListeningReference {
  title: string;
  artist: string;
  url?: string;
  platform?: 'spotify' | 'youtube' | 'soundcloud';
}

interface ModuleEditDialogProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    region_name: string | null;
    color_theme: string | null;
    icon_type: string | null;
    estimated_duration: number | null;
    order_index: number;
    learning_outcomes?: any[];
    cultural_context?: string | null;
    youtube_urls?: string[];
    spotify_urls?: string[];
    listening_references?: ListeningReference[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleEditDialog({ module, open, onOpenChange }: ModuleEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');
  const [regionName, setRegionName] = useState(module.region_name || '');
  const [colorTheme, setColorTheme] = useState(module.color_theme || 'earth');
  const [iconType, setIconType] = useState(module.icon_type || 'mountain');
  const [duration, setDuration] = useState(module.estimated_duration?.toString() || '');
  const [orderIndex, setOrderIndex] = useState(module.order_index.toString());
  
  // Rich content fields
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(
    (module.learning_outcomes || []).map((o: any) => o.text || o)
  );
  const [culturalContext, setCulturalContext] = useState(module.cultural_context || '');
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(module.youtube_urls || []);
  const [spotifyUrls, setSpotifyUrls] = useState<string[]>(module.spotify_urls || []);
  const [listeningRefs, setListeningRefs] = useState<ListeningReference[]>(
    module.listening_references || []
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('course_modules')
        .update({
          title,
          description: description || null,
          region_name: regionName || null,
          color_theme: colorTheme || 'earth',
          icon_type: iconType || 'mountain',
          estimated_duration: duration ? parseInt(duration) : null,
          order_index: parseInt(orderIndex),
          learning_outcomes: learningOutcomes.filter(o => o.trim()).map(text => ({ text })) as unknown as any,
          cultural_context: culturalContext || null,
          youtube_urls: youtubeUrls.filter(u => u.trim()),
          spotify_urls: spotifyUrls.filter(u => u.trim()),
          listening_references: listeningRefs.filter(r => r.title.trim()) as unknown as any,
        })
        .eq('id', module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules'] });
      toast.success('Module updated');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update module');
    },
  });

  const addLearningOutcome = () => setLearningOutcomes([...learningOutcomes, '']);
  const removeLearningOutcome = (idx: number) => setLearningOutcomes(learningOutcomes.filter((_, i) => i !== idx));
  const updateLearningOutcome = (idx: number, value: string) => {
    const updated = [...learningOutcomes];
    updated[idx] = value;
    setLearningOutcomes(updated);
  };

  const addYoutubeUrl = () => setYoutubeUrls([...youtubeUrls, '']);
  const removeYoutubeUrl = (idx: number) => setYoutubeUrls(youtubeUrls.filter((_, i) => i !== idx));
  const updateYoutubeUrl = (idx: number, value: string) => {
    const updated = [...youtubeUrls];
    updated[idx] = value;
    setYoutubeUrls(updated);
  };

  const addSpotifyUrl = () => setSpotifyUrls([...spotifyUrls, '']);
  const removeSpotifyUrl = (idx: number) => setSpotifyUrls(spotifyUrls.filter((_, i) => i !== idx));
  const updateSpotifyUrl = (idx: number, value: string) => {
    const updated = [...spotifyUrls];
    updated[idx] = value;
    setSpotifyUrls(updated);
  };

  const addListeningRef = () => setListeningRefs([...listeningRefs, { title: '', artist: '', url: '', platform: 'spotify' }]);
  const removeListeningRef = (idx: number) => setListeningRefs(listeningRefs.filter((_, i) => i !== idx));
  const updateListeningRef = (idx: number, field: keyof ListeningReference, value: string) => {
    const updated = [...listeningRefs];
    updated[idx] = { ...updated[idx], [field]: value };
    setListeningRefs(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Module: {module.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="basic" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Basic</TabsTrigger>
              <TabsTrigger value="outcomes" className="text-xs"><ListChecks className="h-3 w-3 mr-1" />Outcomes</TabsTrigger>
              <TabsTrigger value="context" className="text-xs"><Globe className="h-3 w-3 mr-1" />Context</TabsTrigger>
              <TabsTrigger value="media" className="text-xs"><Youtube className="h-3 w-3 mr-1" />Media</TabsTrigger>
              <TabsTrigger value="listening" className="text-xs"><Music className="h-3 w-3 mr-1" />Listening</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mod-title">Title</Label>
                <Input id="mod-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-desc">Description / Introduction</Label>
                <Textarea id="mod-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Main introductory text for this module..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mod-region">Region Name</Label>
                  <Input id="mod-region" value={regionName} onChange={(e) => setRegionName(e.target.value)} placeholder="e.g. Andean Highlands" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-order">Order</Label>
                  <Input id="mod-order" type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mod-color">Color Theme</Label>
                  <Input id="mod-color" value={colorTheme} onChange={(e) => setColorTheme(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-icon">Icon Type</Label>
                  <Input id="mod-icon" value={iconType} onChange={(e) => setIconType(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-duration">Duration (mins)</Label>
                  <Input id="mod-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outcomes" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Learning Outcomes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLearningOutcome}>
                  <Plus className="h-3 w-3 mr-1" /> Add Outcome
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">What will students learn or be able to do after completing this module?</p>
              {learningOutcomes.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No learning outcomes yet. Click "Add Outcome" to create one.</p>
              )}
              {learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateLearningOutcome(idx, e.target.value)}
                    placeholder="e.g. Understand the 3/4 time signature in Huayño"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLearningOutcome(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="context" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mod-cultural">Cultural & Musical Context</Label>
                <p className="text-xs text-muted-foreground">Background information about the cultural significance, history, and musical traditions covered in this module.</p>
                <Textarea
                  id="mod-cultural"
                  value={culturalContext}
                  onChange={(e) => setCulturalContext(e.target.value)}
                  rows={8}
                  placeholder="Describe the cultural background, historical context, regional traditions, and musical significance..."
                />
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500" /> YouTube Videos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addYoutubeUrl}>
                    <Plus className="h-3 w-3 mr-1" /> Add Video
                  </Button>
                </div>
                {youtubeUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No YouTube videos yet.</p>
                )}
                {youtubeUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateYoutubeUrl(idx, e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeYoutubeUrl(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Music className="h-4 w-4 text-green-500" /> Spotify Tracks/Playlists</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpotifyUrl}>
                    <Plus className="h-3 w-3 mr-1" /> Add Spotify
                  </Button>
                </div>
                {spotifyUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No Spotify embeds yet.</p>
                )}
                {spotifyUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateSpotifyUrl(idx, e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSpotifyUrl(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="listening" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Listening References</Label>
                <Button type="button" variant="outline" size="sm" onClick={addListeningRef}>
                  <Plus className="h-3 w-3 mr-1" /> Add Reference
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Recommended tracks for students to explore the musical style.</p>
              {listeningRefs.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No listening references yet.</p>
              )}
              {listeningRefs.map((ref, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={ref.title}
                      onChange={(e) => updateListeningRef(idx, 'title', e.target.value)}
                      placeholder="Track title"
                    />
                    <Input
                      value={ref.artist}
                      onChange={(e) => updateListeningRef(idx, 'artist', e.target.value)}
                      placeholder="Artist name"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={ref.url || ''}
                      onChange={(e) => updateListeningRef(idx, 'url', e.target.value)}
                      placeholder="URL (optional)"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeListeningRef(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Module'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
