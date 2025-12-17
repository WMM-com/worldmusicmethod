import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StageIcon } from '@/components/documents/StageIcon';
import { STAGE_ICONS, MIC_TYPES, IconType, StagePlotItem } from '@/types/techSpec';
import { cn } from '@/lib/utils';
import { Brain, User, Building2 } from 'lucide-react';

interface SharedTechSpecData {
  id: string;
  name: string;
  description: string | null;
  stage_width: number;
  stage_depth: number;
  owner_name: string | null;
  owner_business: string | null;
}

export default function SharedTechSpec() {
  const { token } = useParams<{ token: string }>();
  const [spec, setSpec] = useState<SharedTechSpecData | null>(null);
  const [items, setItems] = useState<StagePlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StagePlotItem | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      // Fetch tech spec via function
      const { data: specData, error: specError } = await supabase
        .rpc('get_shared_tech_spec', { p_share_token: token });

      if (specError || !specData || specData.length === 0) {
        setError('Tech spec not found or link has expired');
        setLoading(false);
        return;
      }

      const specInfo = specData[0] as SharedTechSpecData;
      setSpec(specInfo);

      // Fetch stage plot items
      const { data: itemsData, error: itemsError } = await supabase
        .from('stage_plot_items')
        .select('*')
        .eq('tech_spec_id', specInfo.id)
        .order('created_at', { ascending: true });

      if (!itemsError && itemsData) {
        setItems(itemsData as StagePlotItem[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [token]);

  const getPairedItem = (item: StagePlotItem) => {
    if (!item.paired_with_id) return null;
    return items.find((i) => i.id === item.paired_with_id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <Brain className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Link Invalid</h2>
            <p className="text-muted-foreground">{error || 'This tech spec could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{spec.name}</h1>
              <p className="text-sm text-muted-foreground">
                {spec.owner_business || spec.owner_name || 'Tech Specification'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {spec.description && (
          <p className="text-muted-foreground">{spec.description}</p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Stage Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Plot</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative w-full aspect-[4/3] bg-muted/30 rounded-lg border border-border overflow-hidden"
              >
                {/* Stage front indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary/20 to-transparent flex items-end justify-center pb-1">
                  <span className="text-xs text-secondary font-medium">FRONT OF STAGE (AUDIENCE)</span>
                </div>

                {/* Paired item connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {items.map((item) => {
                    const paired = getPairedItem(item);
                    if (!paired || item.id > paired.id) return null;
                    return (
                      <line
                        key={`line-${item.id}-${paired.id}`}
                        x1={`${item.position_x}%`}
                        y1={`${item.position_y}%`}
                        x2={`${paired.position_x}%`}
                        y2={`${paired.position_y}%`}
                        stroke="hsl(var(--secondary))"
                        strokeWidth="2"
                        strokeDasharray="4"
                      />
                    );
                  })}
                </svg>

                {/* Stage items */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all',
                      selectedItem?.id === item.id && 'ring-2 ring-secondary ring-offset-2 ring-offset-background rounded-lg',
                      item.provided_by === 'venue' && 'opacity-70'
                    )}
                    style={{
                      left: `${item.position_x}%`,
                      top: `${item.position_y}%`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={cn(
                        'p-1.5 rounded-lg',
                        item.provided_by === 'artist' ? 'bg-card border border-border' : 'bg-accent/20 border border-accent/50'
                      )}>
                        <StageIcon type={item.icon_type as IconType} size={28} />
                      </div>
                      {item.label && (
                        <span className="text-[10px] font-medium bg-background/80 px-1 rounded max-w-[60px] truncate">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No equipment on stage plot</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Item Details */}
          <div className="space-y-4">
            {selectedItem && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedItem.label || STAGE_ICONS.find(i => i.type === selectedItem.icon_type)?.label || selectedItem.icon_type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {selectedItem.provided_by === 'artist' ? (
                      <>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Provided by Artist</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 text-accent" />
                        <span className="text-accent">Venue to provide</span>
                      </>
                    )}
                  </div>
                  
                  {selectedItem.mic_type && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Mic: </span>
                      {MIC_TYPES.find(m => m.value === (selectedItem.mic_type as string))?.label || selectedItem.mic_type}
                    </div>
                  )}

                  {selectedItem.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      {selectedItem.notes}
                    </div>
                  )}

                  {selectedItem.paired_with_id && (
                    <div className="text-sm text-secondary">
                      Paired with another monitor (same mix)
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Equipment List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment List</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No equipment listed</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const iconInfo = STAGE_ICONS.find((i) => i.type === item.icon_type);
                      const micInfo = item.mic_type ? MIC_TYPES.find((m) => m.value === (item.mic_type as string)) : null;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                            item.provided_by === 'artist' ? 'border-border hover:border-secondary/50' : 'border-accent/50 bg-accent/10',
                            selectedItem?.id === item.id && 'ring-1 ring-secondary'
                          )}
                        >
                          <StageIcon type={item.icon_type as IconType} size={20} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.label || iconInfo?.label || item.icon_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {micInfo?.label && `${micInfo.label} · `}
                              {item.provided_by === 'venue' ? 'Venue provides' : 'Artist provides'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 bg-card border border-border rounded" />
                  <span>Artist provides</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 bg-accent/20 border border-accent/50 rounded" />
                  <span>Venue to provide</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-[2px] w-4 border-t-2 border-dashed border-secondary" />
                  <span>Paired monitors (same mix)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
