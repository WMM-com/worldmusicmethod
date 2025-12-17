export type IconType =
  // People
  | 'person_standing'
  | 'person_seated'
  // Guitars
  | 'electric_guitar'
  | 'acoustic_guitar'
  | 'classical_guitar'
  | 'bass_guitar'
  // Keys
  | 'keyboard'
  | 'piano'
  | 'synth'
  // Drums & Percussion
  | 'drums'
  | 'percussion'
  | 'congas'
  | 'bongos'
  | 'cajon'
  | 'timpani'
  // Orchestral Strings
  | 'violin'
  | 'viola'
  | 'cello'
  | 'double_bass'
  | 'harp'
  // Brass
  | 'trumpet'
  | 'trombone'
  | 'french_horn'
  | 'tuba'
  | 'flugelhorn'
  // Woodwinds
  | 'saxophone'
  | 'clarinet'
  | 'flute'
  | 'oboe'
  | 'bassoon'
  // Audio Equipment
  | 'monitor'
  | 'mic_tall'
  | 'mic_short'
  | 'di_box'
  | 'amp_guitar'
  | 'amp_bass'
  | 'subwoofer'
  | 'iem'
  // Other
  | 'laptop'
  | 'mixer'
  | 'music_stand';

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
  provided_by: ProvidedBy | null;
  paired_with_id: string | null;
  notes: string | null;
  // Channel list fields
  channel_number: number | null;
  phantom_power: boolean;
  insert_required: boolean;
  monitor_mixes: string[] | null;
  fx_sends: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface StageIcon {
  type: IconType;
  label: string;
  category: 'people' | 'guitars' | 'keys' | 'drums' | 'orchestral' | 'brass' | 'woodwinds' | 'audio' | 'other';
  size?: 'sm' | 'md' | 'lg';
}

export const STAGE_ICONS: StageIcon[] = [
  // People
  { type: 'person_standing', label: 'Standing Performer', category: 'people' },
  { type: 'person_seated', label: 'Seated Performer', category: 'people' },
  
  // Guitars
  { type: 'electric_guitar', label: 'Electric Guitar', category: 'guitars' },
  { type: 'acoustic_guitar', label: 'Acoustic Guitar', category: 'guitars' },
  { type: 'classical_guitar', label: 'Classical Guitar', category: 'guitars' },
  { type: 'bass_guitar', label: 'Bass Guitar', category: 'guitars' },
  
  // Keys
  { type: 'keyboard', label: 'Keyboard', category: 'keys' },
  { type: 'piano', label: 'Piano', category: 'keys', size: 'lg' },
  { type: 'synth', label: 'Synthesizer', category: 'keys' },
  
  // Drums & Percussion
  { type: 'drums', label: 'Drum Kit', category: 'drums', size: 'lg' },
  { type: 'percussion', label: 'Percussion', category: 'drums' },
  { type: 'congas', label: 'Congas', category: 'drums' },
  { type: 'bongos', label: 'Bongos', category: 'drums' },
  { type: 'cajon', label: 'Cajón', category: 'drums' },
  { type: 'timpani', label: 'Timpani', category: 'drums', size: 'lg' },
  
  // Orchestral Strings
  { type: 'violin', label: 'Violin', category: 'orchestral' },
  { type: 'viola', label: 'Viola', category: 'orchestral' },
  { type: 'cello', label: 'Cello', category: 'orchestral' },
  { type: 'double_bass', label: 'Double Bass', category: 'orchestral', size: 'lg' },
  { type: 'harp', label: 'Harp', category: 'orchestral', size: 'lg' },
  
  // Brass
  { type: 'trumpet', label: 'Trumpet', category: 'brass' },
  { type: 'trombone', label: 'Trombone', category: 'brass' },
  { type: 'french_horn', label: 'French Horn', category: 'brass' },
  { type: 'tuba', label: 'Tuba', category: 'brass', size: 'lg' },
  { type: 'flugelhorn', label: 'Flugelhorn', category: 'brass' },
  
  // Woodwinds
  { type: 'saxophone', label: 'Saxophone', category: 'woodwinds' },
  { type: 'clarinet', label: 'Clarinet', category: 'woodwinds' },
  { type: 'flute', label: 'Flute', category: 'woodwinds' },
  { type: 'oboe', label: 'Oboe', category: 'woodwinds' },
  { type: 'bassoon', label: 'Bassoon', category: 'woodwinds' },
  
  // Audio Equipment
  { type: 'monitor', label: 'Monitor Wedge', category: 'audio' },
  { type: 'mic_tall', label: 'Mic (Boom Stand)', category: 'audio' },
  { type: 'mic_short', label: 'Mic (Short Stand)', category: 'audio' },
  { type: 'di_box', label: 'DI Box', category: 'audio' },
  { type: 'amp_guitar', label: 'Guitar Amp', category: 'audio' },
  { type: 'amp_bass', label: 'Bass Amp', category: 'audio', size: 'lg' },
  { type: 'subwoofer', label: 'Subwoofer', category: 'audio' },
  { type: 'iem', label: 'IEM Pack', category: 'audio' },
  
  // Other
  { type: 'laptop', label: 'Laptop', category: 'other' },
  { type: 'mixer', label: 'Mixer', category: 'other' },
  { type: 'music_stand', label: 'Music Stand', category: 'other' },
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

export const PERFORMER_ROLES: { value: string; label: string }[] = [
  { value: 'vocalist', label: 'Vocalist' },
  { value: 'lead_vocalist', label: 'Lead Vocalist' },
  { value: 'backing_vocals', label: 'Backing Vocals' },
  { value: 'guitarist', label: 'Guitarist' },
  { value: 'lead_guitar', label: 'Lead Guitar' },
  { value: 'rhythm_guitar', label: 'Rhythm Guitar' },
  { value: 'bassist', label: 'Bassist' },
  { value: 'drummer', label: 'Drummer' },
  { value: 'keyboardist', label: 'Keyboardist' },
  { value: 'pianist', label: 'Pianist' },
  { value: 'violinist', label: 'Violinist' },
  { value: 'cellist', label: 'Cellist' },
  { value: 'trumpet', label: 'Trumpet' },
  { value: 'saxophone', label: 'Saxophone' },
  { value: 'trombone', label: 'Trombone' },
  { value: 'flute', label: 'Flute' },
  { value: 'percussionist', label: 'Percussionist' },
  { value: 'dj', label: 'DJ' },
  { value: 'conductor', label: 'Conductor' },
  { value: 'md', label: 'Musical Director' },
  { value: 'other', label: 'Other' },
];
