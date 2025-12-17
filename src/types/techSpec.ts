export type IconType =
  | 'guitar'
  | 'bass'
  | 'keyboard'
  | 'drums'
  | 'percussion'
  | 'monitor'
  | 'mic_tall'
  | 'mic_short'
  | 'di_box'
  | 'amp_guitar'
  | 'amp_bass'
  | 'subwoofer'
  | 'violin'
  | 'cello'
  | 'saxophone'
  | 'trumpet'
  | 'trombone'
  | 'piano'
  | 'laptop'
  | 'mixer';

export type ProvidedBy = 'artist' | 'venue';

export type MicType =
  | 'sm57'
  | 'sm58'
  | 'beta52'
  | 'e609'
  | 'e906'
  | 'akg_d112'
  | 'akg_c414'
  | 'condenser'
  | 'dynamic'
  | 'ribbon'
  | 'di'
  | 'other';

export interface TechSpec {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  stage_width: number;
  stage_depth: number;
  share_token: string;
  is_publicly_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface StagePlotItem {
  id: string;
  tech_spec_id: string;
  icon_type: IconType;
  label: string | null;
  position_x: number;
  position_y: number;
  rotation: number;
  mic_type: MicType | null;
  provided_by: ProvidedBy;
  paired_with_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageIcon {
  type: IconType;
  label: string;
  category: 'strings' | 'keys' | 'drums' | 'brass' | 'audio' | 'other';
}

export const STAGE_ICONS: StageIcon[] = [
  // Strings
  { type: 'guitar', label: 'Guitar', category: 'strings' },
  { type: 'bass', label: 'Bass Guitar', category: 'strings' },
  { type: 'violin', label: 'Violin', category: 'strings' },
  { type: 'cello', label: 'Cello', category: 'strings' },
  
  // Keys
  { type: 'keyboard', label: 'Keyboard', category: 'keys' },
  { type: 'piano', label: 'Piano', category: 'keys' },
  
  // Drums & Percussion
  { type: 'drums', label: 'Drum Kit', category: 'drums' },
  { type: 'percussion', label: 'Percussion', category: 'drums' },
  
  // Brass & Wind
  { type: 'saxophone', label: 'Saxophone', category: 'brass' },
  { type: 'trumpet', label: 'Trumpet', category: 'brass' },
  { type: 'trombone', label: 'Trombone', category: 'brass' },
  
  // Audio Equipment
  { type: 'monitor', label: 'Monitor', category: 'audio' },
  { type: 'mic_tall', label: 'Mic (Tall Stand)', category: 'audio' },
  { type: 'mic_short', label: 'Mic (Short Stand)', category: 'audio' },
  { type: 'di_box', label: 'DI Box', category: 'audio' },
  { type: 'amp_guitar', label: 'Guitar Amp', category: 'audio' },
  { type: 'amp_bass', label: 'Bass Amp', category: 'audio' },
  { type: 'subwoofer', label: 'Subwoofer', category: 'audio' },
  
  // Other
  { type: 'laptop', label: 'Laptop', category: 'other' },
  { type: 'mixer', label: 'Mixer', category: 'other' },
];

export const MIC_TYPES: { value: MicType; label: string }[] = [
  { value: 'sm57', label: 'Shure SM57' },
  { value: 'sm58', label: 'Shure SM58' },
  { value: 'beta52', label: 'Shure Beta 52A' },
  { value: 'e609', label: 'Sennheiser e609' },
  { value: 'e906', label: 'Sennheiser e906' },
  { value: 'akg_d112', label: 'AKG D112' },
  { value: 'akg_c414', label: 'AKG C414' },
  { value: 'condenser', label: 'Condenser (any)' },
  { value: 'dynamic', label: 'Dynamic (any)' },
  { value: 'ribbon', label: 'Ribbon (any)' },
  { value: 'di', label: 'DI Only' },
  { value: 'other', label: 'Other' },
];
