import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeviceType } from './DevicePreviewToggle';

// Types for per-breakpoint styles
export interface BreakpointStyles {
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  gap?: string;
  columns?: string;
  maxWidth?: string;
  minHeight?: string;
  borderRadius?: string;
  opacity?: string;
  display?: 'block' | 'flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export interface ResponsiveStyles {
  desktop?: BreakpointStyles;
  tablet?: BreakpointStyles;
  mobile?: BreakpointStyles;
}

// Section type to available style fields mapping
const SECTION_STYLE_FIELDS: Record<string, string[]> = {
  text_block: ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign', 'padding', 'maxWidth'],
  heading: ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign', 'padding', 'margin'],
  gallery: ['columns', 'gap', 'padding', 'borderRadius'],
  counter: ['columns', 'gap', 'fontSize', 'textAlign', 'padding'],
  image_block: ['maxWidth', 'borderRadius', 'padding', 'margin', 'opacity'],
  button_block: ['fontSize', 'padding', 'textAlign', 'borderRadius', 'maxWidth'],
  divider: ['padding', 'margin', 'maxWidth', 'opacity'],
  spacer: ['minHeight', 'padding'],
  icon_block: ['fontSize', 'textAlign', 'padding', 'opacity'],
  progress_bar: ['padding', 'maxWidth', 'borderRadius'],
  accordion: ['fontSize', 'padding', 'gap'],
  html_block: ['padding', 'maxWidth', 'fontSize'],
  alert: ['fontSize', 'padding', 'borderRadius', 'textAlign'],
  tabs_block: ['fontSize', 'padding', 'gap'],
  toggle_list: ['fontSize', 'padding', 'gap'],
  slider_block: ['padding', 'maxWidth', 'minHeight'],
  testimonial: ['fontSize', 'textAlign', 'padding', 'gap', 'columns'],
  carousel: ['padding', 'gap', 'minHeight', 'borderRadius'],
  shortcode: ['padding', 'maxWidth'],
  audio_player: ['padding', 'maxWidth'],
  donation: ['padding', 'maxWidth', 'textAlign', 'borderRadius'],
  digital_products: ['columns', 'gap', 'padding', 'textAlign'],
  projects: ['columns', 'gap', 'padding'],
  custom_tabs: ['fontSize', 'padding', 'gap'],
  social_feed: ['padding', 'maxWidth'],
  spotify: ['padding', 'maxWidth', 'minHeight'],
  youtube: ['padding', 'maxWidth', 'minHeight', 'borderRadius'],
  soundcloud: ['padding', 'maxWidth', 'minHeight'],
  generic: ['padding', 'maxWidth', 'minHeight'],
  events: ['padding', 'gap', 'fontSize'],
  bio: ['fontSize', 'lineHeight', 'textAlign', 'padding'],
};

// Default fields for unknown section types
const DEFAULT_FIELDS = ['fontSize', 'textAlign', 'padding', 'margin', 'gap', 'maxWidth'];

const DEVICE_ICONS: Record<DeviceType, typeof Smartphone> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  mobile: 'Mobile (375px)',
  tablet: 'Tablet (768px)',
  desktop: 'Desktop (1440px)',
};

interface BreakpointStyleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionType: string;
  sectionTitle: string;
  currentStyles: ResponsiveStyles;
  onSave: (styles: ResponsiveStyles) => void;
  activeBreakpoint?: DeviceType;
}

// Style field render components
function StyleField({ 
  field, 
  value, 
  onChange 
}: { 
  field: string; 
  value: string | undefined; 
  onChange: (value: string | undefined) => void;
}) {
  const fieldConfig = getFieldConfig(field);
  
  if (fieldConfig.type === 'select') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{fieldConfig.label}</Label>
        <Select value={value || ''} onValueChange={(v) => onChange(v || undefined)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={fieldConfig.placeholder || 'Default'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__inherit__">Default (inherit)</SelectItem>
            {fieldConfig.options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (fieldConfig.type === 'slider') {
    const numValue = parseInt(value || '0') || fieldConfig.default || 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{fieldConfig.label}</Label>
          <span className="text-xs font-mono text-muted-foreground">{value || 'Default'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            value={[numValue]}
            onValueChange={([v]) => onChange(`${v}${fieldConfig.unit || 'px'}`)}
            min={fieldConfig.min || 0}
            max={fieldConfig.max || 100}
            step={fieldConfig.step || 1}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onChange(undefined)}
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{fieldConfig.label}</Label>
      <div className="flex items-center gap-2">
        <Input
          className="h-9 text-sm font-mono"
          placeholder={fieldConfig.placeholder || 'e.g. 16px'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onChange(undefined)}
          title="Reset"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function getFieldConfig(field: string) {
  const configs: Record<string, any> = {
    fontSize: { label: 'Font Size', type: 'slider', min: 8, max: 72, step: 1, unit: 'px', default: 16 },
    lineHeight: { label: 'Line Height', type: 'slider', min: 10, max: 80, step: 1, unit: 'px', default: 24 },
    letterSpacing: { label: 'Letter Spacing', type: 'slider', min: -5, max: 20, step: 0.5, unit: 'px', default: 0 },
    textAlign: { label: 'Text Align', type: 'select', options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'justify', label: 'Justify' },
    ]},
    padding: { label: 'Padding (all)', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    paddingTop: { label: 'Padding Top', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    paddingBottom: { label: 'Padding Bottom', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    margin: { label: 'Margin (all)', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    marginTop: { label: 'Margin Top', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    marginBottom: { label: 'Margin Bottom', type: 'slider', min: 0, max: 80, step: 2, unit: 'px', default: 0 },
    gap: { label: 'Gap', type: 'slider', min: 0, max: 48, step: 2, unit: 'px', default: 16 },
    columns: { label: 'Columns', type: 'select', options: [
      { value: '1', label: '1 Column' },
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
      { value: '5', label: '5 Columns' },
      { value: '6', label: '6 Columns' },
    ]},
    maxWidth: { label: 'Max Width', type: 'input', placeholder: 'e.g. 600px, 100%' },
    minHeight: { label: 'Min Height', type: 'slider', min: 0, max: 600, step: 10, unit: 'px', default: 0 },
    borderRadius: { label: 'Border Radius', type: 'slider', min: 0, max: 32, step: 1, unit: 'px', default: 0 },
    opacity: { label: 'Opacity', type: 'slider', min: 0, max: 100, step: 5, unit: '%', default: 100 },
    display: { label: 'Display', type: 'select', options: [
      { value: 'block', label: 'Block' },
      { value: 'flex', label: 'Flex' },
      { value: 'grid', label: 'Grid' },
      { value: 'none', label: 'Hidden' },
    ]},
    flexDirection: { label: 'Direction', type: 'select', options: [
      { value: 'row', label: 'Row' },
      { value: 'column', label: 'Column' },
    ]},
    alignItems: { label: 'Align Items', type: 'select', options: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'end', label: 'End' },
      { value: 'stretch', label: 'Stretch' },
    ]},
    justifyContent: { label: 'Justify Content', type: 'select', options: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'end', label: 'End' },
      { value: 'between', label: 'Space Between' },
      { value: 'around', label: 'Space Around' },
    ]},
  };
  return configs[field] || { label: field, type: 'input', placeholder: 'Value' };
}

export function BreakpointStyleEditor({
  open,
  onOpenChange,
  sectionType,
  sectionTitle,
  currentStyles,
  onSave,
  activeBreakpoint = 'desktop',
}: BreakpointStyleEditorProps) {
  const [styles, setStyles] = useState<ResponsiveStyles>(currentStyles || {});
  const [activeDevice, setActiveDevice] = useState<DeviceType>(activeBreakpoint);

  // Sync from props when opened
  useEffect(() => {
    if (open) {
      setStyles(currentStyles || {});
      setActiveDevice(activeBreakpoint);
    }
  }, [open, currentStyles, activeBreakpoint]);

  const fields = useMemo(() => {
    return SECTION_STYLE_FIELDS[sectionType] || DEFAULT_FIELDS;
  }, [sectionType]);

  const currentDeviceStyles = styles[activeDevice] || {};

  const updateField = (field: string, value: string | undefined) => {
    setStyles(prev => {
      const deviceStyles = { ...(prev[activeDevice] || {}) };
      if (value && value !== '__inherit__') {
        (deviceStyles as any)[field] = value;
      } else {
        delete (deviceStyles as any)[field];
      }
      return { ...prev, [activeDevice]: deviceStyles };
    });
  };

  const handleSave = () => {
    // Clean empty breakpoint objects
    const cleaned: ResponsiveStyles = {};
    for (const device of ['desktop', 'tablet', 'mobile'] as DeviceType[]) {
      const ds = styles[device];
      if (ds && Object.keys(ds).length > 0) {
        cleaned[device] = ds;
      }
    }
    onSave(cleaned);
    onOpenChange(false);
  };

  const handleReset = () => {
    setStyles(prev => ({ ...prev, [activeDevice]: {} }));
  };

  const hasStyles = Object.values(currentDeviceStyles).some(v => v !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Style: {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Breakpoint Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => {
            const Icon = DEVICE_ICONS[device];
            const isActive = activeDevice === device;
            const deviceHasStyles = styles[device] && Object.keys(styles[device]!).length > 0;
            return (
              <button
                key={device}
                onClick={() => setActiveDevice(device)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium transition-colors relative',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{device.charAt(0).toUpperCase() + device.slice(1)}</span>
                {deviceHasStyles && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Editing for <strong>{DEVICE_LABELS[activeDevice]}</strong>. Styles cascade: desktop → tablet → mobile. Only set overrides where needed.
        </p>

        {/* Style Fields */}
        <div className="space-y-4 py-2">
          {/* Typography Group */}
          {fields.some(f => ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign'].includes(f)) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typography</h4>
              {fields.filter(f => ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign'].includes(f)).map(field => (
                <StyleField
                  key={field}
                  field={field}
                  value={(currentDeviceStyles as any)[field]}
                  onChange={(v) => updateField(field, v)}
                />
              ))}
            </div>
          )}

          {/* Spacing Group */}
          {fields.some(f => ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'margin', 'marginTop', 'marginBottom', 'gap'].includes(f)) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spacing</h4>
              {fields.filter(f => ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'margin', 'marginTop', 'marginBottom', 'gap'].includes(f)).map(field => (
                <StyleField
                  key={field}
                  field={field}
                  value={(currentDeviceStyles as any)[field]}
                  onChange={(v) => updateField(field, v)}
                />
              ))}
            </div>
          )}

          {/* Layout Group */}
          {fields.some(f => ['columns', 'maxWidth', 'minHeight', 'display', 'flexDirection', 'alignItems', 'justifyContent'].includes(f)) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout</h4>
              {fields.filter(f => ['columns', 'maxWidth', 'minHeight', 'display', 'flexDirection', 'alignItems', 'justifyContent'].includes(f)).map(field => (
                <StyleField
                  key={field}
                  field={field}
                  value={(currentDeviceStyles as any)[field]}
                  onChange={(v) => updateField(field, v)}
                />
              ))}
            </div>
          )}

          {/* Appearance Group */}
          {fields.some(f => ['borderRadius', 'opacity'].includes(f)) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h4>
              {fields.filter(f => ['borderRadius', 'opacity'].includes(f)).map(field => (
                <StyleField
                  key={field}
                  field={field}
                  value={(currentDeviceStyles as any)[field]}
                  onChange={(v) => updateField(field, v)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasStyles}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset {activeDevice}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
              Save Styles
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility: resolve styles for a given screen width, with cascade
export function resolveResponsiveStyles(
  responsiveStyles: ResponsiveStyles | undefined,
  screenWidth: number
): React.CSSProperties {
  if (!responsiveStyles) return {};

  // Cascade: desktop is base, tablet overrides, mobile overrides
  const desktop = responsiveStyles.desktop || {};
  const tablet = responsiveStyles.tablet || {};
  const mobile = responsiveStyles.mobile || {};

  let merged: BreakpointStyles;
  if (screenWidth < 768) {
    merged = { ...desktop, ...tablet, ...mobile };
  } else if (screenWidth < 1024) {
    merged = { ...desktop, ...tablet };
  } else {
    merged = { ...desktop };
  }

  return breakpointStylesToCSS(merged);
}

function breakpointStylesToCSS(styles: BreakpointStyles): React.CSSProperties {
  const css: React.CSSProperties = {};
  
  if (styles.fontSize) css.fontSize = styles.fontSize;
  if (styles.lineHeight) css.lineHeight = styles.lineHeight;
  if (styles.letterSpacing) css.letterSpacing = styles.letterSpacing;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.padding) css.padding = styles.padding;
  if (styles.paddingTop) css.paddingTop = styles.paddingTop;
  if (styles.paddingBottom) css.paddingBottom = styles.paddingBottom;
  if (styles.paddingLeft) css.paddingLeft = styles.paddingLeft;
  if (styles.paddingRight) css.paddingRight = styles.paddingRight;
  if (styles.margin) css.margin = styles.margin;
  if (styles.marginTop) css.marginTop = styles.marginTop;
  if (styles.marginBottom) css.marginBottom = styles.marginBottom;
  if (styles.gap) css.gap = styles.gap;
  if (styles.maxWidth) css.maxWidth = styles.maxWidth;
  if (styles.minHeight) css.minHeight = styles.minHeight;
  if (styles.borderRadius) css.borderRadius = styles.borderRadius;
  if (styles.opacity) {
    const opVal = parseInt(styles.opacity);
    css.opacity = opVal >= 0 && opVal <= 100 ? opVal / 100 : undefined;
  }
  if (styles.display) css.display = styles.display;
  if (styles.flexDirection) css.flexDirection = styles.flexDirection as any;
  if (styles.alignItems) css.alignItems = styles.alignItems;
  if (styles.justifyContent) {
    const map: Record<string, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
    };
    css.justifyContent = map[styles.justifyContent] || styles.justifyContent;
  }

  return css;
}

// Hook to get current screen width for responsive style resolution
export function useScreenWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  return width;
}
