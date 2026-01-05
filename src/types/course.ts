export interface Course {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  country: string;
  region_theme: Record<string, any>;
  cover_image_url: string | null;
  is_published: boolean;
  tutor_name: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  region_name: string | null;
  color_theme: string;
  icon_type: string;
  estimated_duration: number | null;
  created_at: string;
  updated_at: string;
  lessons?: ModuleLesson[];
}

export interface ModuleLesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: 'video' | 'reading' | 'listening' | 'assignment';
  video_url: string | null;
  soundslice_preset?: string | null;
  duration_seconds: number | null;
  content: string | null;
  listening_references: ListeningReference[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ListeningReference {
  title: string;
  artist: string;
  url?: string;
  platform?: 'spotify' | 'youtube' | 'soundcloud';
}

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  watch_time_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPracticeScore {
  id: string;
  user_id: string;
  course_id: string | null;
  practice_type: 'rhythm' | 'ear_training' | 'theory';
  score: number;
  max_score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  metadata: Record<string, any>;
  created_at: string;
}


export interface CourseWithModules extends Course {
  modules: CourseModule[];
}

// Peru-specific region data for the map
export const PERU_REGIONS = {
  highlands: {
    name: 'Andean Highlands',
    color: 'from-amber-900 to-emerald-800',
    accent: 'amber',
    description: 'The sacred mountains where Huayño was born'
  },
  valleys: {
    name: 'Mountain Valleys',
    color: 'from-emerald-800 to-teal-700',
    accent: 'emerald',
    description: 'Where melodic traditions evolved'
  },
  coast: {
    name: 'Coastal Cities',
    color: 'from-slate-600 to-blue-800',
    accent: 'slate',
    description: 'Elegant waltz and refined styles'
  },
  pacific: {
    name: 'Pacific Coast',
    color: 'from-orange-800 to-red-900',
    accent: 'orange',
    description: 'Afro-Peruvian rhythmic heritage'
  }
} as const;

export type PeruRegion = keyof typeof PERU_REGIONS;
