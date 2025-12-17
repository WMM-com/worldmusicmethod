import { useState, useRef, useMemo } from 'react';
import { TechSpec, StagePlotItem, IconType, STAGE_ICONS, MIC_TYPES, ProvidedBy } from '@/types/techSpec';
import { useStagePlotItems } from '@/hooks/useTechSpecs';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Trash2, Link2, Unlink, Download, RotateCcw, RotateCw } from 'lucide-react';
import { StageIcon } from './StageIcon';
import { cn } from '@/lib/utils';
import { downloadTechSpecPdf } from '@/lib/generateTechSpecPdf';

interface StagePlotEditorProps {
  techSpec: TechSpec;
  onBack: () => void;
}

interface ConsolidatedItem {
  icon_type: IconType;
  label: string;
  mic_type: string | null;
  provided_by: ProvidedBy | null;
  count: number;
}

export function StagePlotEditor({ techSpec, onBack }: StagePlotEditorProps) {
  const { profile } = useAuth();
  const { items, addItem, updateItem, deleteItem, pairItems } = useStagePlotItems(techSpec.id);
  const [selectedItem, setSelectedItem] = useState<StagePlotItem | null>(null);
  const [draggingItem, setDraggingItem] = useState<StagePlotItem | null>(null);
  const [pairingMode, setPairingMode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = () => {
    downloadTechSpecPdf(techSpec, items, profile);
  };

  const filteredIcons = STAGE_ICONS.filter(
    (icon) =>
      icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedIcons = filteredIcons.reduce((acc, icon) => {
    if (!acc[icon.category]) acc[icon.category] = [];
    acc[icon.category].push(icon);
    return acc;
  }, {} as Record<string, typeof STAGE_ICONS>);

  // Consolidate items for equipment list
  const consolidatedItems = useMemo(() => {
    const itemMap = new Map<string, ConsolidatedItem>();
    
    items.forEach(item => {
      const iconInfo = STAGE_ICONS.find(i => i.type === item.icon_type);
      const displayLabel = item.label || iconInfo?.label || item.icon_type;
      const key = `${item.icon_type}-${displayLabel}-${item.mic_type || ''}-${item.provided_by || ''}`;
      
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.count += 1;
      } else {
        itemMap.set(key, {
          icon_type: item.icon_type as IconType,
          label: displayLabel,
          mic_type: item.mic_type,
          provided_by: item.provided_by as ProvidedBy | null,
          count: 1,
        });
      }
    });
    
    return Array.from(itemMap.values());
  }, [items]);

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const iconType = e.dataTransfer.getData('iconType') as IconType;
    const itemId = e.dataTransfer.getData('itemId');
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (itemId) {
      await updateItem(itemId, { position_x: x, position_y: y });
    } else if (iconType) {
      const newItem = await addItem(iconType, x, y);
      if (newItem) setSelectedItem(newItem);
    }
  };

  const handleItemClick = (item: StagePlotItem) => {
    if (pairingMode && pairingMode !== item.id) {
      pairItems(pairingMode, item.id);
      pairItems(item.id, pairingMode);
      setPairingMode(null);
    } else {
      setSelectedItem(item);
    }
  };

  const handleStartPairing = () => {
    if (selectedItem) {
      setPairingMode(selectedItem.id);
    }
  };

  const handleUnpair = async () => {
    if (selectedItem?.paired_with_id) {
      await pairItems(selectedItem.paired_with_id, null);
      await pairItems(selectedItem.id, null);
    }
  };

  const getPairedItem = (item: StagePlotItem) => {
    if (!item.paired_with_id) return null;
    return items.find((i) => i.id === item.paired_with_id);
  };

  const handleLabelChange = (value: string) => {
    if (selectedItem) {
      updateItem(selectedItem.id, { label: value || null });
      setSelectedItem({ ...selectedItem, label: value || null });
    }
  };

  const handleProvidedByChange = (value: string) => {
    if (selectedItem) {
      const providedBy = value === 'none' ? null : value as ProvidedBy;
      updateItem(selectedItem.id, { provided_by: providedBy });
      setSelectedItem({ ...selectedItem, provided_by: providedBy });
    }
  };

  const handleMicTypeChange = (value: string) => {
    if (selectedItem) {
      updateItem(selectedItem.id, { mic_type: value || null } as Partial<StagePlotItem>);
      setSelectedItem({ ...selectedItem, mic_type: value || null } as StagePlotItem);
    }
  };

  const handleNotesChange = (value: string) => {
    if (selectedItem) {
      updateItem(selectedItem.id, { notes: value || null });
      setSelectedItem({ ...selectedItem, notes: value || null });
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    if (selectedItem) {
      const newRotation = direction === 'left' 
        ? (selectedItem.rotation - 15 + 360) % 360 
        : (selectedItem.rotation + 15) % 360;
      updateItem(selectedItem.id, { rotation: newRotation });
      setSelectedItem({ ...selectedItem, rotation: newRotation });
    }
  };

  const categoryLabels: Record<string, string> = {
    guitars: 'Guitars',
    keys: 'Keys',
    drums: 'Drums & Percussion',
    orchestral: 'Orchestral Strings',
    brass: 'Brass',
    woodwinds: 'Woodwinds',
    audio: 'Audio Equipment',
    other: 'Other',
  };

  const categoryOrder = ['guitars', 'keys', 'drums', 'orchestral', 'brass', 'woodwinds', 'audio', 'other'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{techSpec.name}</h2>
            {techSpec.description && (
              <p className="text-sm text-muted-foreground">{techSpec.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={handleExportPdf} disabled={items.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
        {/* Icon Palette */}
        <Card className="lg:h-[600px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equipment</CardTitle>
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px] px-4 pb-4">
              <div className="space-y-4">
                {categoryOrder.map((category) => {
                  const icons = groupedIcons[category];
                  if (!icons?.length) return null;
                  return (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        {categoryLabels[category]}
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {icons.map((icon) => (
                          <div
                            key={icon.type}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('iconType', icon.type);
                            }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-secondary hover:bg-card cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <StageIcon type={icon.type} size={icon.size === 'lg' ? 40 : 32} />
                            <span className="text-xs text-center leading-tight">{icon.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Stage Canvas */}
        <Card className="lg:h-[600px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stage Plot</CardTitle>
              <span className="text-xs text-muted-foreground">
                Drag equipment onto the stage
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div
              ref={canvasRef}
              className="relative w-full aspect-[4/3] bg-muted/30 rounded-lg border-2 border-dashed border-border overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onClick={() => {
                if (!pairingMode) setSelectedItem(null);
              }}
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
              {items.map((item) => {
                const iconInfo = STAGE_ICONS.find(i => i.type === item.icon_type);
                const iconSize = iconInfo?.size === 'lg' ? 36 : 28;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('itemId', item.id);
                      setDraggingItem(item);
                    }}
                    onDragEnd={() => setDraggingItem(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all',
                      selectedItem?.id === item.id && 'ring-2 ring-secondary ring-offset-2 ring-offset-background rounded-lg',
                      pairingMode && pairingMode !== item.id && 'animate-pulse',
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
                        item.provided_by === 'artist' ? 'bg-card border border-border' : 
                        item.provided_by === 'venue' ? 'bg-accent/20 border border-accent/50' :
                        'bg-muted border border-border'
                      )}>
                        <StageIcon type={item.icon_type as IconType} size={iconSize} />
                      </div>
                      {item.label && (
                        <span className="text-[10px] font-medium bg-background/80 px-1 rounded max-w-[60px] truncate">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Drag equipment from the left panel
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Item Properties */}
        <Card className="lg:h-[600px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={selectedItem.label || ''}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="e.g., Lead Vocal, Kick Drum"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Provided By</Label>
                  <Select
                    value={selectedItem.provided_by || 'none'}
                    onValueChange={handleProvidedByChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="venue">Venue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rotation</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRotate('left')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground flex-1 text-center">
                      {selectedItem.rotation}°
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRotate('right')}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(selectedItem.icon_type === 'mic_tall' || 
                  selectedItem.icon_type === 'mic_short' ||
                  selectedItem.icon_type === 'di_box') && (
                  <div className="space-y-2">
                    <Label>Mic Type</Label>
                    <Select
                      value={selectedItem.mic_type || ''}
                      onValueChange={handleMicTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mic type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MIC_TYPES.map((mic) => (
                          <SelectItem key={mic.value} value={mic.value}>
                            {mic.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={selectedItem.notes || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                {selectedItem.icon_type === 'monitor' && (
                  <div className="space-y-2">
                    <Label>Monitor Pairing</Label>
                    {selectedItem.paired_with_id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground flex-1">
                          Paired with another monitor
                        </span>
                        <Button size="sm" variant="outline" onClick={handleUnpair}>
                          <Unlink className="h-4 w-4 mr-1" />
                          Unpair
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={handleStartPairing}
                        disabled={!!pairingMode}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        {pairingMode === selectedItem.id ? 'Click another monitor...' : 'Pair with Monitor'}
                      </Button>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      deleteItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Select an item on the stage to edit its properties</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equipment List - Consolidated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipment List</CardTitle>
        </CardHeader>
        <CardContent>
          {consolidatedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No equipment added yet</p>
          ) : (
            <div className="space-y-1">
              {consolidatedItems.map((item, index) => {
                const micInfo = item.mic_type ? MIC_TYPES.find((m) => m.value === item.mic_type) : null;
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-3 py-2 px-3 rounded-lg border',
                      item.provided_by === 'artist' ? 'border-border' : 
                      item.provided_by === 'venue' ? 'border-accent/50 bg-accent/10' :
                      'border-border/50'
                    )}
                  >
                    <StageIcon type={item.icon_type} size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {item.count > 1 ? `${item.count}x ` : ''}{item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {micInfo?.label && `${micInfo.label} · `}
                        {item.provided_by === 'venue' ? 'Venue provides' : 
                         item.provided_by === 'artist' ? 'Artist provides' : 
                         'Provider not specified'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
