export type GroupPrivacy = 'public' | 'private' | 'secret';
export type GroupCategory = 'genre' | 'instrument' | 'collaboration' | 'learning' | 'networking' | 'local' | 'production' | 'other';
export type GroupMemberRole = 'admin' | 'moderator' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category: GroupCategory;
  subcategory: string | null;
  privacy: GroupPrivacy;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  is_pinned: boolean;
  is_announcement: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  comment_count?: number;
}

export interface GroupPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  group?: {
    id: string;
    name: string;
    cover_image_url: string | null;
  };
}

export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
}

export interface GroupPoll {
  id: string;
  group_id: string;
  created_by: string;
  question: string;
  options: string[];
  ends_at: string | null;
  is_multiple_choice: boolean;
  created_at: string;
  votes?: { option_index: number; count: number }[];
  user_votes?: number[];
}

export const CATEGORY_LABELS: Record<GroupCategory, string> = {
  genre: 'Genre',
  instrument: 'Instrument',
  collaboration: 'Collaboration',
  learning: 'Learning',
  networking: 'Networking',
  local: 'Local',
  production: 'Production',
  other: 'Other',
};

export const SUBCATEGORIES: Record<GroupCategory, string[]> = {
  genre: ['Jazz', 'Rock', 'Classical', 'Electronic', 'Hip Hop', 'R&B', 'Folk', 'Country', 'Metal', 'Pop', 'World Music', 'Blues', 'Reggae', 'Soul', 'Funk'],
  instrument: ['Guitar', 'Piano/Keys', 'Drums', 'Bass', 'Vocals', 'Violin', 'Saxophone', 'Trumpet', 'Flute', 'DJ/Turntables', 'Producer', 'Synth'],
  collaboration: ['Looking for Band Members', 'Session Musicians', 'Songwriting Partners', 'Remote Collaboration', 'Cover Projects'],
  learning: ['Beginners', 'Music Theory', 'Ear Training', 'Technique', 'Improvisation', 'Composition', 'Production Skills'],
  networking: ['Industry Connections', 'Venue Owners', 'Music Business', 'Promoters', 'Managers', 'Labels'],
  local: [],
  production: ['Recording', 'Mixing', 'Mastering', 'Sound Design', 'Live Sound', 'Home Studio'],
  other: [],
};
