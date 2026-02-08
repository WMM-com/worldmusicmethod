import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────

export interface R2File {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

export interface AudioMapping {
  questionId: string;
  currentUrl: string;
  suggestedUrl: string | null;
  suggestedKey: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  accepted: boolean;
  reason: string;
}

// ── Filename → R2 type mapping ──────────────────────────────

const ABBREVIATION_MAP: Record<string, string> = {
  'Maj7': 'Major-7th',
  'Dom7': 'Dominant-7th',
  'Min7b5': 'Minor-7th',
  'Min7': 'Minor-7th',
  'Dim7': 'Diminished-7th',
  'Aug': 'Augmented-Chord',
  'Dim': 'Diminished-Chord',
  'M2': 'Major-2nd',
  'M3': 'Major-3rd',
  'M6': 'Major-6th',
  'M7': 'Major-7th',
  'P4': 'Perfect-4th',
  'P5': 'Perfect-5th',
  'Oct': 'Octave',
  'm2': 'Major-2nd-',
  'm3': 'Minor-3rd',
  'm6': 'Minor-6th',
  'm7': 'Minor-7th',
  'TT': 'Perfect-5th',
  'Major': 'Major-Chord',
  'Minor': 'Minor-Chord',
};

const SCALE_MAP: Record<string, string> = {
  'Major': 'Major-Ascending',
  'Minor': 'Minor-Ascending',
};

/**
 * Parse a DB filename like "Maj7-1" into { type, index, testSlug }
 */
export function parseDbFilename(audioUrl: string): { type: string; index: number; testSlug: string } | null {
  const match = audioUrl.match(/\/tests\/([^/]+)\/([^/]+)\.mp3$/i);
  if (!match) return null;
  const testSlug = match[1];
  const filename = match[2];
  const parts = filename.match(/^(.+?)-(\d+)$/);
  if (!parts) return null;
  return { type: parts[1], index: parseInt(parts[2], 10), testSlug };
}

/**
 * Given R2 files grouped by type and a DB filename,
 * find the best-matching R2 file.
 */
export function findBestMatch(
  parsed: { type: string; index: number; testSlug: string },
  r2FilesByType: Map<string, R2File[]>
): { file: R2File; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  let r2Type: string | undefined;

  if (parsed.testSlug === 'major-minor-scales') {
    r2Type = SCALE_MAP[parsed.type];
    if (parsed.index > 5) {
      r2Type = parsed.type === 'Major' ? 'Major-Descending' : 'Minor-Descending';
    }
  } else {
    r2Type = ABBREVIATION_MAP[parsed.type];
  }

  if (!r2Type) return null;

  const candidates = r2FilesByType.get(r2Type);
  if (!candidates || candidates.length === 0) return null;

  let effectiveIndex = parsed.index;
  if (parsed.testSlug === 'major-minor-scales' && parsed.index > 5) {
    effectiveIndex = parsed.index - 5;
  }

  if (effectiveIndex <= candidates.length) {
    const file = candidates[effectiveIndex - 1];
    const isExactMapping = ABBREVIATION_MAP[parsed.type] === r2Type || SCALE_MAP[parsed.type] === r2Type;
    return {
      file,
      confidence: isExactMapping ? 'high' : 'medium',
      reason: `${parsed.type}-${parsed.index} → ${file.key}`,
    };
  }

  const file = candidates[candidates.length - 1];
  return {
    file,
    confidence: 'low',
    reason: `Index ${parsed.index} exceeds ${candidates.length} available files`,
  };
}

/**
 * Group R2 files by their "type" (the part after the number prefix).
 */
export function groupR2FilesByType(files: R2File[]): Map<string, R2File[]> {
  const groups = new Map<string, R2File[]>();

  for (const file of files) {
    const basename = file.key.replace(/^.*\//, '').replace(/\.mp3$/i, '');
    const match = basename.match(/^(\d+)-(.+)$/);
    if (!match) continue;
    const type = match[2];
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(file);
  }

  for (const [, files] of groups) {
    files.sort((a, b) => {
      const aNum = parseInt(a.key.match(/\/(\d+)-/)?.[1] || '0');
      const bNum = parseInt(b.key.match(/\/(\d+)-/)?.[1] || '0');
      return aNum - bNum;
    });
  }

  return groups;
}

// ── Hook: auto-map a single question ────────────────────────

export function useR2AutoMapSingle() {
  const queryClient = useQueryClient();
  const [isMapping, setIsMapping] = useState(false);

  const autoMapQuestion = async (
    questionId: string,
    currentAudioUrl: string
  ): Promise<{ success: boolean; newUrl?: string; reason: string }> => {
    setIsMapping(true);
    try {
      // Parse the current audio URL
      const parsed = parseDbFilename(currentAudioUrl);
      if (!parsed) {
        toast.error('Could not parse the audio URL pattern');
        return { success: false, reason: 'Could not parse filename pattern' };
      }

      // Load R2 files
      const { data, error } = await supabase.functions.invoke('r2-test-audio', {
        body: { action: 'list', prefix: '2024/08/' },
      });
      if (error) throw error;

      const files: R2File[] = data.files || [];
      if (files.length === 0) {
        toast.error('No R2 files found');
        return { success: false, reason: 'No R2 files found' };
      }

      const r2Groups = groupR2FilesByType(files);
      const match = findBestMatch(parsed, r2Groups);

      if (!match) {
        toast.error(`No R2 match found for "${parsed.type}"`);
        return { success: false, reason: `No R2 match for type "${parsed.type}"` };
      }

      if (match.confidence === 'low') {
        toast.warning(`Low confidence match: ${match.reason}. Not auto-applied.`);
        return { success: false, reason: match.reason };
      }

      // Save directly to DB
      const { error: updateError } = await supabase
        .from('test_questions')
        .update({ audio_url: match.file.url })
        .eq('id', questionId);

      if (updateError) throw updateError;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });

      toast.success(`Audio mapped (${match.confidence}): ${match.reason}`);
      return { success: true, newUrl: match.file.url, reason: match.reason };
    } catch (err: any) {
      toast.error(err.message || 'Auto-mapping failed');
      return { success: false, reason: err.message || 'Auto-mapping failed' };
    } finally {
      setIsMapping(false);
    }
  };

  return { autoMapQuestion, isMapping };
}
