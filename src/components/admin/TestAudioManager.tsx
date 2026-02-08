import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Volume2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface Props {
  onBack: () => void;
}

export function TestAudioManager({ onBack }: Props) {
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [urlStatuses, setUrlStatuses] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [r2Prefix, setR2Prefix] = useState('courses/');
  const [r2Files, setR2Files] = useState<R2File[]>([]);
  const [isLoadingR2, setIsLoadingR2] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [showR2Browser, setShowR2Browser] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all tests with audio questions
  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ['admin-tests-with-audio'],
    queryFn: async () => {
      // Get all tests
      const { data: allTests, error: tErr } = await supabase
        .from('lesson_tests')
        .select('id, title, lesson_id');
      if (tErr) throw tErr;

      // Get all questions with audio
      const { data: questions, error: qErr } = await supabase
        .from('test_questions')
        .select('*')
        .not('audio_url', 'is', null)
        .order('order_index');
      if (qErr) throw qErr;

      // Get lesson/module/course info
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

      // Build test info
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

  // Check URL validity
  const checkUrls = async () => {
    const currentTest = tests?.find((t) => t.test_id === selectedTest);
    if (!currentTest) return;

    const urls = currentTest.questions
      .map((q) => q.audio_url)
      .filter(Boolean) as string[];

    if (urls.length === 0) return;

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-test-audio', {
        body: { action: 'check-urls', urls },
      });
      if (error) throw error;
      setUrlStatuses(data.results || {});
      const broken = Object.values(data.results).filter((v) => !v).length;
      if (broken > 0) {
        toast.error(`${broken} broken audio URL(s) found`);
      } else {
        toast.success('All audio URLs are valid!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to check URLs');
    } finally {
      setIsChecking(false);
    }
  };

  // Browse R2 files
  const loadR2Files = async (prefix?: string) => {
    setIsLoadingR2(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-test-audio', {
        body: { action: 'list', prefix: prefix || r2Prefix },
      });
      if (error) throw error;
      setR2Files(data.files || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to list R2 files');
    } finally {
      setIsLoadingR2(false);
    }
  };

  // Upload audio file for a question
  const handleFileUpload = useCallback(
    async (questionId: string, file: File) => {
      const currentTest = tests?.find((t) => t.test_id === selectedTest);
      const question = currentTest?.questions.find((q) => q.id === questionId);
      if (!question) return;

      setUploadingQuestionId(questionId);

      try {
        // Determine folder from current URL pattern
        let folder = 'courses/theory-by-ear/tests/misc';
        if (question.audio_url) {
          const match = question.audio_url.match(
            /r2\.dev\/(.+)\/[^/]+$/
          );
          if (match) folder = match[1];
        }

        // Read file as base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke(
          'r2-test-audio',
          {
            body: {
              action: 'upload',
              fileName: file.name,
              fileType: file.type || 'audio/mpeg',
              fileData: base64,
              folder,
            },
          }
        );

        if (error) throw error;

        // Update the question's audio_url in the database
        const { error: updateErr } = await supabase
          .from('test_questions')
          .update({ audio_url: data.url })
          .eq('id', questionId);

        if (updateErr) throw updateErr;

        queryClient.invalidateQueries({
          queryKey: ['admin-tests-with-audio'],
        });
        toast.success(`Audio uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setUploadingQuestionId(null);
      }
    },
    [tests, selectedTest, queryClient]
  );

  // Assign an R2 file URL to a question
  const assignR2Url = async (questionId: string, url: string) => {
    try {
      const { error } = await supabase
        .from('test_questions')
        .update({ audio_url: url })
        .eq('id', questionId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
      setSelectedQuestionId(null);
      setShowR2Browser(false);
      toast.success('Audio URL updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update URL');
    }
  };

  // Play/pause audio
  const togglePlay = (url: string) => {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {
          toast.error('Audio playback failed – URL may be broken');
        });
        setPlayingUrl(url);
      }
    }
  };

  const currentTest = tests?.find((t) => t.test_id === selectedTest);

  return (
    <div className="space-y-6">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingUrl(null)}
        onError={() => {
          setPlayingUrl(null);
        }}
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingQuestionId) {
            handleFileUpload(uploadingQuestionId, file);
          }
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
          <p className="text-muted-foreground">
            Manage audio files for lesson tests
          </p>
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
                setUrlStatuses({});
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
                    <span className="text-muted-foreground">
                      {t.test_title}
                    </span>
                    {' '}
                    <span className="text-xs text-muted-foreground">
                      ({t.questions.length} audio Qs)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Selected test – question list */}
      {currentTest && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{currentTest.test_title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentTest.course_title} › {currentTest.module_title}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkUrls}
                disabled={isChecking}
              >
                {isChecking ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Check URLs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowR2Browser(true);
                  loadR2Files();
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse R2
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentTest.questions.map((q, idx) => {
                const status = q.audio_url
                  ? urlStatuses[q.audio_url]
                  : undefined;
                const isUploading = uploadingQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg transition-colors',
                      status === false && 'border-destructive/50 bg-destructive/5',
                      status === true && 'border-green-500/50 bg-green-500/5'
                    )}
                  >
                    {/* Question number */}
                    <span className="text-sm font-mono text-muted-foreground w-8 shrink-0">
                      Q{idx + 1}
                    </span>

                    {/* Status icon */}
                    <div className="shrink-0">
                      {status === true && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {status === false && (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      {status === undefined && (
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Question info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {q.question_text || 'Audio question'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {q.audio_url
                          ? q.audio_url.replace(
                              'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/',
                              ''
                            )
                          : 'No audio URL'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Play/pause */}
                      {q.audio_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => togglePlay(q.audio_url!)}
                        >
                          {playingUrl === q.audio_url ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}

                      {/* Upload replacement */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isUploading}
                        onClick={() => {
                          setUploadingQuestionId(q.id);
                          fileInputRef.current?.click();
                        }}
                      >
                        {isUploading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Assign from R2 browser */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedQuestionId(q.id);
                          setShowR2Browser(true);
                          loadR2Files();
                        }}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {Object.keys(urlStatuses).length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {Object.values(urlStatuses).filter(Boolean).length} valid
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="w-4 h-4" />
                    {Object.values(urlStatuses).filter((v) => !v).length} broken
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* R2 Media Browser */}
      {showR2Browser && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              R2 Media Browser
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowR2Browser(false);
                setSelectedQuestionId(null);
              }}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            {/* Prefix search */}
            <div className="flex gap-2 mb-4">
              <Input
                value={r2Prefix}
                onChange={(e) => setR2Prefix(e.target.value)}
                placeholder="Search prefix e.g. 2024/08/"
                className="flex-1"
              />
              <Button
                onClick={() => loadR2Files(r2Prefix)}
                disabled={isLoadingR2}
              >
                {isLoadingR2 ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Quick prefix buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                '2024/08/',
                '2024/07/',
                'courses/theory-by-ear/',
                'courses/',
              ].map((prefix) => (
                <Button
                  key={prefix}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setR2Prefix(prefix);
                    loadR2Files(prefix);
                  }}
                >
                  {prefix}
                </Button>
              ))}
            </div>

            {selectedQuestionId && (
              <div className="p-2 mb-4 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                <strong>Assigning audio to question.</strong> Click a file below to assign it.
              </div>
            )}

            {/* File list */}
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
                        selectedQuestionId && 'hover:bg-primary/10'
                      )}
                      onClick={() => {
                        if (selectedQuestionId) {
                          assignR2Url(selectedQuestionId, file.url);
                        }
                      }}
                    >
                      <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-mono">{file.key}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(file.url);
                        }}
                      >
                        {playingUrl === file.url ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="mt-2 text-xs text-muted-foreground">
              {r2Files.length} file(s) found
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
