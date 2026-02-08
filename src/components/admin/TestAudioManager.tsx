import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Music,
  FolderOpen,
  RefreshCw,
  Search,
  Link2,
  Wand2,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────

interface TestQuestion {
  id: string;
  test_id: string;
  question_text: string | null;
  audio_url: string | null;
  order_index: number;
  points: number;
}

interface TestInfo {
  test_id: string;
  test_title: string;
  lesson_title: string;
  module_title: string;
  course_title: string;
  questions: TestQuestion[];
}

interface R2File {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

interface AudioMapping {
  questionId: string;
  currentUrl: string;
  suggestedUrl: string | null;
  suggestedKey: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  accepted: boolean;
  reason: string;
}

interface RevertEntry {
  questionId: string;
  previousUrl: string | null;
  newUrl: string;
  timestamp: number;
}

interface Props {
  onBack: () => void;
}

// ── Filename → R2 type mapping ──────────────────────────────

const ABBREVIATION_MAP: Record<string, string> = {
  // 7th chords
  'Maj7': 'Major-7th',
  'Dom7': 'Dominant-7th',
  'Min7b5': 'Minor-7th', // half-diminished – closest match
  'Min7': 'Minor-7th',
  'Dim7': 'Diminished-7th',
  // Chord types
  'Aug': 'Augmented-Chord',
  'Dim': 'Diminished-Chord',
  // Intervals (uppercase = major/perfect, lowercase = minor)
  'M2': 'Major-2nd',
  'M3': 'Major-3rd',
  'M6': 'Major-6th',
  'M7': 'Major-7th',
  'P4': 'Perfect-4th',
  'P5': 'Perfect-5th',
  'Oct': 'Octave',
  'm2': 'Major-2nd-', // minor 2nd → trailing-dash variant
  'm3': 'Minor-3rd',
  'm6': 'Minor-6th',
  'm7': 'Minor-7th',
  'TT': 'Perfect-5th', // tritone – closest match
  // Chord types (full name)
  'Major': 'Major-Chord',
  'Minor': 'Minor-Chord',
};

// For scales test, the slug tells us ascending vs descending
const SCALE_MAP: Record<string, string> = {
  'Major': 'Major-Ascending',
  'Minor': 'Minor-Ascending',
};

/**
 * Parse a DB filename like "Maj7-1" into { type: "Maj7", index: 1 }
 */
function parseDbFilename(audioUrl: string): { type: string; index: number; testSlug: string } | null {
  // Extract test slug and filename from URL
  const match = audioUrl.match(/\/tests\/([^/]+)\/([^/]+)\.mp3$/i);
  if (!match) return null;
  const testSlug = match[1];
  const filename = match[2];

  // Extract type and index: "Maj7-1" → type="Maj7", index=1
  const parts = filename.match(/^(.+?)-(\d+)$/);
  if (!parts) return null;

  return { type: parts[1], index: parseInt(parts[2], 10), testSlug };
}

/**
 * Given R2 files grouped by type and a DB filename,
 * find the best-matching R2 file.
 */
function findBestMatch(
  parsed: { type: string; index: number; testSlug: string },
  r2FilesByType: Map<string, R2File[]>
): { file: R2File; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  // Determine R2 type name
  let r2Type: string | undefined;

  // Check if this is a scales test
  if (parsed.testSlug === 'major-minor-scales') {
    r2Type = SCALE_MAP[parsed.type];
    // For scales, indices 1-5 might be ascending, 6-10 descending
    if (parsed.index > 5) {
      r2Type = parsed.type === 'Major' ? 'Major-Descending' : 'Minor-Descending';
    }
  } else {
    r2Type = ABBREVIATION_MAP[parsed.type];
  }

  if (!r2Type) return null;

  const candidates = r2FilesByType.get(r2Type);
  if (!candidates || candidates.length === 0) return null;

  // For scales with index > 5, adjust to 1-5 range
  let effectiveIndex = parsed.index;
  if (parsed.testSlug === 'major-minor-scales' && parsed.index > 5) {
    effectiveIndex = parsed.index - 5;
  }

  // Find the file at the correct ordinal position (1-indexed)
  if (effectiveIndex <= candidates.length) {
    const file = candidates[effectiveIndex - 1];
    // Check if type abbreviation is an exact known mapping
    const isExactMapping = ABBREVIATION_MAP[parsed.type] === r2Type || SCALE_MAP[parsed.type] === r2Type;
    return {
      file,
      confidence: isExactMapping ? 'high' : 'medium',
      reason: `${parsed.type}-${parsed.index} → ${file.key}`,
    };
  }

  // Index out of range – return closest
  const file = candidates[candidates.length - 1];
  return {
    file,
    confidence: 'low',
    reason: `Index ${parsed.index} exceeds ${candidates.length} available files`,
  };
}

/**
 * Group R2 files by their "type" (the part after the number prefix).
 * e.g. "2024/08/1-Major-7th.mp3" → type = "Major-7th"
 */
function groupR2FilesByType(files: R2File[]): Map<string, R2File[]> {
  const groups = new Map<string, R2File[]>();

  for (const file of files) {
    // Extract filename from key: "2024/08/1-Major-7th.mp3" → "1-Major-7th"
    const basename = file.key.replace(/^.*\//, '').replace(/\.mp3$/i, '');
    // Split into number and type: "1-Major-7th" → number=1, type="Major-7th"
    const match = basename.match(/^(\d+)-(.+)$/);
    if (!match) continue;

    const type = match[2];
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(file);
  }

  // Sort each group by the number prefix
  for (const [, files] of groups) {
    files.sort((a, b) => {
      const aNum = parseInt(a.key.match(/\/(\d+)-/)?.[1] || '0');
      const bNum = parseInt(b.key.match(/\/(\d+)-/)?.[1] || '0');
      return aNum - bNum;
    });
  }

  return groups;
}

// ── Component ────────────────────────────────────────────────

export function TestAudioManager({ onBack }: Props) {
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [r2Files, setR2Files] = useState<R2File[]>([]);
  const [isLoadingR2, setIsLoadingR2] = useState(false);
  const [mappings, setMappings] = useState<AudioMapping[]>([]);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showR2Browser, setShowR2Browser] = useState(false);
  const [r2BrowserQuestionId, setR2BrowserQuestionId] = useState<string | null>(null);
  const [r2Prefix, setR2Prefix] = useState('2024/08/');
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [revertHistory, setRevertHistory] = useState<RevertEntry[]>([]);
  const [revertingQuestionId, setRevertingQuestionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────

  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ['admin-tests-with-audio'],
    queryFn: async () => {
      const { data: allTests, error: tErr } = await supabase
        .from('lesson_tests')
        .select('id, title, lesson_id');
      if (tErr) throw tErr;

      const { data: questions, error: qErr } = await supabase
        .from('test_questions')
        .select('*')
        .not('audio_url', 'is', null)
        .order('order_index');
      if (qErr) throw qErr;

      const lessonIds = allTests?.map((t) => t.lesson_id) || [];
      const { data: lessons } = await supabase
        .from('module_lessons')
        .select('id, title, module_id')
        .in('id', lessonIds);

      const moduleIds = [...new Set(lessons?.map((l) => l.module_id) || [])];
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id, title, course_id')
        .in('id', moduleIds);

      const courseIds = [...new Set(modules?.map((m) => m.course_id) || [])];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      const result: TestInfo[] = [];
      for (const test of allTests || []) {
        const testQuestions = questions?.filter((q) => q.test_id === test.id) || [];
        if (testQuestions.length === 0) continue;

        const lesson = lessons?.find((l) => l.id === test.lesson_id);
        const module = modules?.find((m) => m.id === lesson?.module_id);
        const course = courses?.find((c) => c.id === module?.course_id);

        result.push({
          test_id: test.id,
          test_title: test.title,
          lesson_title: lesson?.title || '',
          module_title: module?.title || '',
          course_title: course?.title || '',
          questions: testQuestions,
        });
      }

      return result;
    },
  });

  const currentTest = tests?.find((t) => t.test_id === selectedTest);

  // Count stats from mappings
  const mappingStats = useMemo(() => {
    const high = mappings.filter((m) => m.confidence === 'high').length;
    const medium = mappings.filter((m) => m.confidence === 'medium').length;
    const low = mappings.filter((m) => m.confidence === 'low').length;
    const none = mappings.filter((m) => m.confidence === 'none').length;
    const accepted = mappings.filter((m) => m.accepted).length;
    return { high, medium, low, none, accepted, total: mappings.length };
  }, [mappings]);

  // ── R2 loading ─────────────────────────────────────────────

  const loadR2Files = async (prefix?: string) => {
    setIsLoadingR2(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-test-audio', {
        body: { action: 'list', prefix: prefix || r2Prefix },
      });
      if (error) throw error;
      setR2Files(data.files || []);
      return data.files || [];
    } catch (err: any) {
      toast.error(err.message || 'Failed to list R2 files');
      return [];
    } finally {
      setIsLoadingR2(false);
    }
  };

  // ── Auto-mapping ───────────────────────────────────────────

  const runAutoMapping = async () => {
    if (!currentTest) return;

    setIsAutoMapping(true);
    try {
      // Load R2 files if not already loaded
      let files = r2Files;
      if (files.length === 0) {
        files = await loadR2Files('2024/08/');
      }

      if (files.length === 0) {
        toast.error('No R2 files found at 2024/08/ prefix');
        return;
      }

      const r2Groups = groupR2FilesByType(files);
      const newMappings: AudioMapping[] = [];

      for (const question of currentTest.questions) {
        if (!question.audio_url) continue;

        const parsed = parseDbFilename(question.audio_url);

        if (!parsed) {
          newMappings.push({
            questionId: question.id,
            currentUrl: question.audio_url,
            suggestedUrl: null,
            suggestedKey: null,
            confidence: 'none',
            accepted: false,
            reason: 'Could not parse filename pattern',
          });
          continue;
        }

        const match = findBestMatch(parsed, r2Groups);

        if (match) {
          newMappings.push({
            questionId: question.id,
            currentUrl: question.audio_url,
            suggestedUrl: match.file.url,
            suggestedKey: match.file.key,
            confidence: match.confidence,
            accepted: match.confidence === 'high', // Auto-accept high confidence
            reason: match.reason,
          });
        } else {
          newMappings.push({
            questionId: question.id,
            currentUrl: question.audio_url,
            suggestedUrl: null,
            suggestedKey: null,
            confidence: 'none',
            accepted: false,
            reason: `No R2 match for type "${parsed.type}"`,
          });
        }
      }

      setMappings(newMappings);

      const autoAccepted = newMappings.filter((m) => m.accepted).length;
      toast.success(
        `Auto-mapped ${autoAccepted} of ${newMappings.length} questions. Review and apply.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Auto-mapping failed');
    } finally {
      setIsAutoMapping(false);
    }
  };

  // ── Apply mappings ─────────────────────────────────────────

  const applyMappings = async () => {
    const toApply = mappings.filter((m) => m.accepted && m.suggestedUrl);
    if (toApply.length === 0) {
      toast.error('No accepted mappings to apply');
      return;
    }

    setIsApplying(true);
    let successCount = 0;
    let errorCount = 0;

    for (const mapping of toApply) {
      // Capture previous URL for revert
      const question = currentTest?.questions.find((q) => q.id === mapping.questionId);
      const previousUrl = question?.audio_url || null;

      const { error } = await supabase
        .from('test_questions')
        .update({ audio_url: mapping.suggestedUrl })
        .eq('id', mapping.questionId);

      if (error) {
        errorCount++;
        console.error('Failed to update:', mapping.questionId, error);
      } else {
        successCount++;
        // Track revert history
        setRevertHistory((prev) => [
          ...prev.filter((r) => r.questionId !== mapping.questionId),
          { questionId: mapping.questionId, previousUrl, newUrl: mapping.suggestedUrl!, timestamp: Date.now() },
        ]);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
    setMappings([]);
    toast.success(`Updated ${successCount} audio URLs${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    setIsApplying(false);
  };

  // ── Toggle accept ──────────────────────────────────────────

  const toggleAccept = (questionId: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.questionId === questionId ? { ...m, accepted: !m.accepted } : m
      )
    );
  };

  const acceptAll = () => {
    setMappings((prev) =>
      prev.map((m) =>
        m.suggestedUrl ? { ...m, accepted: true } : m
      )
    );
  };

  // ── Manual R2 assignment ───────────────────────────────────

  const assignR2Url = async (questionId: string, url: string, key: string) => {
    // Save directly to DB when manually selecting from R2 browser
    try {
      // Capture previous URL for revert
      const question = currentTest?.questions.find((q) => q.id === questionId);
      const previousUrl = question?.audio_url || null;

      const { error } = await supabase
        .from('test_questions')
        .update({ audio_url: url })
        .eq('id', questionId);

      if (error) throw error;

      // Track revert history
      setRevertHistory((prev) => [
        ...prev.filter((r) => r.questionId !== questionId),
        { questionId, previousUrl, newUrl: url, timestamp: Date.now() },
      ]);

      // Update local mappings state too
      setMappings((prev) => {
        const existing = prev.find((m) => m.questionId === questionId);
        if (existing) {
          return prev.map((m) =>
            m.questionId === questionId
              ? { ...m, suggestedUrl: url, suggestedKey: key, confidence: 'high', accepted: true, reason: 'Manually selected & saved' }
              : m
          );
        }
        return prev;
      });

      // Refetch test data so UI reflects the change
      queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });

      setShowR2Browser(false);
      setR2BrowserQuestionId(null);
      toast.success('Audio URL saved to database!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save audio URL');
    }
  };

  // ── Revert audio URL ──────────────────────────────────────

  const revertAudioUrl = async (questionId: string) => {
    const entry = revertHistory.find((r) => r.questionId === questionId);
    if (!entry) return;

    setRevertingQuestionId(questionId);
    try {
      const { error } = await supabase
        .from('test_questions')
        .update({ audio_url: entry.previousUrl })
        .eq('id', questionId);

      if (error) throw error;

      // Remove from revert history
      setRevertHistory((prev) => prev.filter((r) => r.questionId !== questionId));

      // Clear mapping for this question
      setMappings((prev) => prev.filter((m) => m.questionId !== questionId));

      queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
      toast.success('Audio URL reverted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert audio URL');
    } finally {
      setRevertingQuestionId(null);
    }
  };

  // ── File upload ────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (questionId: string, file: File) => {
      setUploadingQuestionId(questionId);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('r2-test-audio', {
          body: {
            action: 'upload',
            fileName: file.name,
            fileType: file.type || 'audio/mpeg',
            fileData: base64,
            folder: '2024/08',
          },
        });

        if (error) throw error;

        // Update DB directly
        const { error: updateErr } = await supabase
          .from('test_questions')
          .update({ audio_url: data.url })
          .eq('id', questionId);

        if (updateErr) throw updateErr;

        queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setUploadingQuestionId(null);
      }
    },
    [queryClient]
  );

  // ── Audio playback ─────────────────────────────────────────

  const togglePlay = (url: string) => {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => toast.error('Playback failed'));
        setPlayingUrl(url);
      }
    }
  };

  // ── Confidence badge ───────────────────────────────────────

  const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">Medium</Badge>;
      case 'low':
        return <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-xs">Low</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs">No match</Badge>;
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlayingUrl(null)} onError={() => setPlayingUrl(null)} />
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingQuestionId) handleFileUpload(uploadingQuestionId, file);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Test Audio Manager</h2>
          <p className="text-muted-foreground">Auto-map broken audio URLs to existing R2 files</p>
        </div>
      </div>

      {/* Test selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Test</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTests ? (
            <div className="animate-pulse h-10 bg-muted rounded" />
          ) : (
            <Select
              value={selectedTest || ''}
              onValueChange={(v) => {
                setSelectedTest(v);
                setMappings([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a test with audio questions..." />
              </SelectTrigger>
              <SelectContent>
                {tests?.map((t) => (
                  <SelectItem key={t.test_id} value={t.test_id}>
                    <span className="font-medium">{t.course_title}</span>
                    {' › '}
                    <span className="text-muted-foreground">{t.test_title}</span>
                    {' '}
                    <span className="text-xs text-muted-foreground">({t.questions.length} Qs)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Test questions + mapping */}
      {currentTest && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">{currentTest.test_title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentTest.course_title} › {currentTest.module_title} • {currentTest.questions.length} audio questions
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={runAutoMapping}
                disabled={isAutoMapping || isLoadingR2}
                className="gap-2"
              >
                {isAutoMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Auto-Map from R2
              </Button>
              {mappings.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={acceptAll}>
                    Accept All
                  </Button>
                  <Button
                    onClick={applyMappings}
                    disabled={isApplying || mappingStats.accepted === 0}
                    variant="default"
                    className="gap-2"
                  >
                    {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Apply {mappingStats.accepted} Updates
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {/* Mapping stats */}
          {mappings.length > 0 && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-4 text-sm p-3 bg-muted rounded-lg">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {mappingStats.high} high confidence
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  {mappingStats.medium} medium
                </span>
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                  {mappingStats.low} low
                </span>
                {mappingStats.none > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="w-4 h-4" />
                    {mappingStats.none} no match
                  </span>
                )}
              </div>
            </div>
          )}

          <CardContent>
            <div className="overflow-y-auto max-h-[calc(100vh-300px)] space-y-2">
                {currentTest.questions.map((q, idx) => {
                  const mapping = mappings.find((m) => m.questionId === q.id);
                  const isUploading = uploadingQuestionId === q.id;
                  const shortUrl = q.audio_url?.replace('https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/', '') || '';

                  return (
                    <div
                      key={q.id}
                      className={cn(
                        'p-3 border rounded-lg transition-colors',
                        mapping?.accepted && 'border-green-500/50 bg-green-500/5',
                        mapping && !mapping.accepted && mapping.confidence !== 'none' && 'border-yellow-500/30 bg-yellow-500/5',
                        mapping?.confidence === 'none' && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Question number */}
                        <span className="text-sm font-mono text-muted-foreground w-8 shrink-0">Q{idx + 1}</span>

                        {/* Question info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {q.question_text || 'Audio question'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            {shortUrl}
                          </p>
                        </div>

                        {/* Play current */}
                        {q.audio_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => togglePlay(q.audio_url!)}>
                            {playingUrl === q.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        )}

                        {/* Upload */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={isUploading}
                          onClick={() => {
                            setUploadingQuestionId(q.id);
                            fileInputRef.current?.click();
                          }}
                        >
                          {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </Button>

                        {/* Manual R2 browser */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            setR2BrowserQuestionId(q.id);
                            setShowR2Browser(true);
                            if (r2Files.length === 0) loadR2Files();
                          }}
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>

                        {/* Revert button – appears after a URL was saved */}
                        {revertHistory.find((r) => r.questionId === q.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-orange-500 hover:text-orange-700 hover:bg-orange-500/10"
                            disabled={revertingQuestionId === q.id}
                            onClick={() => revertAudioUrl(q.id)}
                            title="Revert to previous audio URL"
                          >
                            {revertingQuestionId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>

                      {/* Mapping suggestion row */}
                      {mapping && (
                        <div className="mt-2 ml-11 flex items-center gap-2 flex-wrap">
                          <ConfidenceBadge confidence={mapping.confidence} />
                          {mapping.suggestedKey ? (
                            <>
                              <span className="text-xs font-mono text-muted-foreground">→</span>
                              <span className="text-xs font-mono truncate max-w-[300px]">{mapping.suggestedKey}</span>
                              {/* Play suggested */}
                              {mapping.suggestedUrl && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePlay(mapping.suggestedUrl!)}>
                                  {playingUrl === mapping.suggestedUrl ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                </Button>
                              )}
                              {/* Accept/reject toggle */}
                              <Button
                                variant={mapping.accepted ? 'default' : 'outline'}
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => toggleAccept(q.id)}
                              >
                                {mapping.accepted ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                {mapping.accepted ? 'Accepted' : 'Rejected'}
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">{mapping.reason}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          </CardContent>
        </Card>
      )}

      {/* R2 Media Browser Modal */}
      {showR2Browser && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              R2 Media Browser
              {r2BrowserQuestionId && (
                <Badge variant="secondary" className="ml-2">Selecting for question</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowR2Browser(false); setR2BrowserQuestionId(null); }}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={r2Prefix}
                onChange={(e) => setR2Prefix(e.target.value)}
                placeholder="Prefix e.g. 2024/08/"
                className="flex-1"
              />
              <Button onClick={() => loadR2Files(r2Prefix)} disabled={isLoadingR2}>
                {isLoadingR2 ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['2024/08/', '2024/07/', ''].map((prefix) => (
                <Button
                  key={prefix || 'all'}
                  variant="outline"
                  size="sm"
                  onClick={() => { setR2Prefix(prefix); loadR2Files(prefix); }}
                >
                  {prefix || 'All files'}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-[400px]">
              {r2Files.length === 0 && !isLoadingR2 ? (
                <p className="text-center text-muted-foreground py-8">
                  No audio files found. Try a different prefix.
                </p>
              ) : (
                <div className="space-y-1">
                  {r2Files.map((file) => (
                    <div
                      key={file.key}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
                        r2BrowserQuestionId && 'hover:bg-primary/10'
                      )}
                      onClick={() => {
                        if (r2BrowserQuestionId) {
                          assignR2Url(r2BrowserQuestionId, file.url, file.key);
                        }
                      }}
                    >
                      <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-mono">{file.key}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => { e.stopPropagation(); togglePlay(file.url); }}
                      >
                        {playingUrl === file.url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground">{r2Files.length} file(s)</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
