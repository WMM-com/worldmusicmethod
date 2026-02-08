import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Music, 
  CheckCircle2,
  ArrowLeft,
  Save,
  Volume2,
  Upload,
  Play,
  Pause,
  RefreshCw,
  Wand2,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LessonTestWithQuestions, TestQuestionWithAnswers, TestAnswer } from '@/types/test';
import { useR2AutoMapSingle } from '@/hooks/useR2AudioAutoMap';
import { R2BrowseModal } from './R2BrowseModal';

interface TestEditorProps {
  lessonId: string;
  lessonTitle: string;
  onBack: () => void;
}

interface QuestionFormData {
  id?: string;
  question_text: string;
  audio_url: string;
  points: number;
  answers: {
    id?: string;
    answer_text: string;
    is_correct: boolean;
  }[];
}

export function TestEditor({ lessonId, lessonTitle, onBack }: TestEditorProps) {
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState<QuestionFormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'question' | 'test'; id: string } | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const { autoMapQuestion, isMapping: isAutoMapping } = useR2AutoMapSingle();
  const [showR2Browse, setShowR2Browse] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [testSettings, setTestSettings] = useState({
    title: '',
    description: '',
    passing_score: 70,
    randomize_questions: true,
    allow_retry: true
  });
  
  // Fetch existing test data
  const { data: test, isLoading } = useQuery({
    queryKey: ['admin-lesson-test', lessonId],
    queryFn: async () => {
      const { data: existingTest, error } = await supabase
        .from('lesson_tests')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!existingTest) return null;
      
      // Fetch questions
      const { data: questions, error: qError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', existingTest.id)
        .order('order_index');
      
      if (qError) throw qError;
      
      // Fetch answers
      const questionIds = questions?.map(q => q.id) || [];
      let answers: TestAnswer[] = [];
      if (questionIds.length > 0) {
        const { data: answersData, error: aError } = await supabase
          .from('test_answers')
          .select('*')
          .in('question_id', questionIds)
          .order('order_index');
        
        if (aError) throw aError;
        answers = answersData || [];
      }
      
      // Update local state
      setTestSettings({
        title: existingTest.title,
        description: existingTest.description || '',
        passing_score: existingTest.passing_score,
        randomize_questions: existingTest.randomize_questions,
        allow_retry: existingTest.allow_retry
      });
      
      return {
        ...existingTest,
        questions: questions?.map(q => ({
          ...q,
          answers: answers.filter(a => a.question_id === q.id)
        })) || []
      } as LessonTestWithQuestions;
    }
  });
  
  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('lesson_tests')
        .insert({
          lesson_id: lessonId,
          ...testSettings
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
      toast.success('Test created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create test');
    }
  });
  
  // Update test mutation
  const updateTestMutation = useMutation({
    mutationFn: async () => {
      if (!test) return;
      const { error } = await supabase
        .from('lesson_tests')
        .update(testSettings)
        .eq('id', test.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
      toast.success('Test settings saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update test');
    }
  });
  
  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async () => {
      if (!test) return;
      const { error } = await supabase
        .from('lesson_tests')
        .delete()
        .eq('id', test.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
      toast.success('Test deleted');
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete test');
    }
  });
  
  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async (data: QuestionFormData) => {
      if (!test) throw new Error('No test exists');
      
      if (data.id) {
        // Update existing question
        const { error: qError } = await supabase
          .from('test_questions')
          .update({
            question_text: data.question_text || null,
            audio_url: data.audio_url || null,
            points: data.points
          })
          .eq('id', data.id);
        
        if (qError) throw qError;
        
        // Delete existing answers and recreate
        await supabase.from('test_answers').delete().eq('question_id', data.id);
        
        const answersToInsert = data.answers.map((a, idx) => ({
          question_id: data.id!,
          answer_text: a.answer_text,
          is_correct: a.is_correct,
          order_index: idx
        }));
        
        const { error: aError } = await supabase
          .from('test_answers')
          .insert(answersToInsert);
        
        if (aError) throw aError;
      } else {
        // Create new question
        const currentQuestions = test.questions?.length || 0;
        
        const { data: newQuestion, error: qError } = await supabase
          .from('test_questions')
          .insert({
            test_id: test.id,
            question_text: data.question_text || null,
            audio_url: data.audio_url || null,
            points: data.points,
            order_index: currentQuestions
          })
          .select()
          .single();
        
        if (qError) throw qError;
        
        const answersToInsert = data.answers.map((a, idx) => ({
          question_id: newQuestion.id,
          answer_text: a.answer_text,
          is_correct: a.is_correct,
          order_index: idx
        }));
        
        const { error: aError } = await supabase
          .from('test_answers')
          .insert(answersToInsert);
        
        if (aError) throw aError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
      setEditingQuestion(null);
      toast.success('Question saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save question');
    }
  });
  
  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('test_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
      setDeleteTarget(null);
      toast.success('Question deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete question');
    }
  });
  
  // Add new answer to editing question
  const addAnswer = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      answers: [
        ...editingQuestion.answers,
        { answer_text: '', is_correct: false }
      ]
    });
  };
  
  // Remove answer from editing question
  const removeAnswer = (index: number) => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      answers: editingQuestion.answers.filter((_, i) => i !== index)
    });
  };
  
  // Update answer in editing question
  const updateAnswer = (index: number, field: string, value: any) => {
    if (!editingQuestion) return;
    const newAnswers = [...editingQuestion.answers];
    
    if (field === 'is_correct' && value === true) {
      // Only one correct answer
      newAnswers.forEach((a, i) => {
        a.is_correct = i === index;
      });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }
    
    setEditingQuestion({
      ...editingQuestion,
      answers: newAnswers
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Test Editor</h2>
          <p className="text-muted-foreground">{lessonTitle}</p>
        </div>
      </div>
      
      {/* Test Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Test Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title</Label>
              <Input
                id="title"
                value={testSettings.title}
                onChange={(e) => setTestSettings({ ...testSettings, title: e.target.value })}
                placeholder="Enter test title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passing_score">Passing Score (%)</Label>
              <Input
                id="passing_score"
                type="number"
                min={0}
                max={100}
                value={testSettings.passing_score}
                onChange={(e) => setTestSettings({ ...testSettings, passing_score: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={testSettings.description}
              onChange={(e) => setTestSettings({ ...testSettings, description: e.target.value })}
              placeholder="Brief description of the test"
              rows={2}
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="randomize"
                checked={testSettings.randomize_questions}
                onCheckedChange={(checked) => setTestSettings({ ...testSettings, randomize_questions: checked })}
              />
              <Label htmlFor="randomize">Randomize question order</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="retry"
                checked={testSettings.allow_retry}
                onCheckedChange={(checked) => setTestSettings({ ...testSettings, allow_retry: checked })}
              />
              <Label htmlFor="retry">Allow retry for half points</Label>
            </div>
          </div>
          
          <div className="flex gap-2">
            {test ? (
              <>
                <Button onClick={() => updateTestMutation.mutate()} disabled={updateTestMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteTarget({ type: 'test', id: test.id })}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Test
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => createTestMutation.mutate()} 
                disabled={createTestMutation.isPending || !testSettings.title}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Questions List */}
      {test && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Questions ({test.questions?.length || 0})</CardTitle>
            <Button 
              onClick={() => setEditingQuestion({
                question_text: '',
                audio_url: '',
                points: 1,
                answers: [
                  { answer_text: '', is_correct: true },
                  { answer_text: '', is_correct: false }
                ]
              })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
            {test.questions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions yet. Add your first question to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {test.questions?.map((question, idx) => (
                  <div
                    key={question.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Q{idx + 1}.</span>
                        {question.audio_url && (
                          <Badge variant="outline" className="gap-1">
                            <Volume2 className="w-3 h-3" />
                            Audio
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {question.question_text || 'Audio question'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {question.answers?.length || 0} answers • {question.points} pts
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingQuestion({
                        id: question.id,
                        question_text: question.question_text || '',
                        audio_url: question.audio_url || '',
                        points: question.points,
                        answers: question.answers?.map(a => ({
                          id: a.id,
                          answer_text: a.answer_text,
                          is_correct: a.is_correct
                        })) || []
                      })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget({ type: 'question', id: question.id })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Hidden audio & file input */}
      <audio
        ref={audioPreviewRef}
        onEnded={() => setPlayingAudioUrl(null)}
        onError={() => setPlayingAudioUrl(null)}
      />
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !editingQuestion) return;
          e.target.value = '';
          
          setIsUploadingAudio(true);
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
                folder: 'courses/test-audio',
              },
            });

            if (error) throw error;
            setEditingQuestion({ ...editingQuestion, audio_url: data.url });
            toast.success(`Uploaded: ${file.name}`);
          } catch (err: any) {
            toast.error(err.message || 'Upload failed');
          } finally {
            setIsUploadingAudio(false);
          }
        }}
      />

      {/* Question Editor Dialog */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingQuestion.id ? 'Edit Question' : 'Add Question'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audio URL with preview & upload */}
              <div className="space-y-2">
                <Label>Audio URL (R2)</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingQuestion.audio_url}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, audio_url: e.target.value })}
                    placeholder="https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/..."
                    className="flex-1"
                  />
                  {editingQuestion.audio_url && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = editingQuestion.audio_url;
                        if (playingAudioUrl === url) {
                          audioPreviewRef.current?.pause();
                          setPlayingAudioUrl(null);
                        } else if (audioPreviewRef.current) {
                          audioPreviewRef.current.src = url;
                          audioPreviewRef.current.play().catch(() => toast.error('Playback failed'));
                          setPlayingAudioUrl(url);
                        }
                      }}
                    >
                      {playingAudioUrl === editingQuestion.audio_url ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isUploadingAudio}
                    onClick={() => audioFileInputRef.current?.click()}
                  >
                    {isUploadingAudio ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                  {/* Auto-map from R2 button */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isAutoMapping || !editingQuestion.audio_url || !editingQuestion.id}
                    title="Auto-map audio from R2"
                    onClick={async () => {
                      if (!editingQuestion.id || !editingQuestion.audio_url) return;
                      const result = await autoMapQuestion(editingQuestion.id, editingQuestion.audio_url);
                      if (result.success && result.newUrl) {
                        setEditingQuestion({ ...editingQuestion, audio_url: result.newUrl });
                      }
                    }}
                  >
                    {isAutoMapping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                  </Button>
                  {/* Browse R2 files */}
                  <Button
                    variant="outline"
                    size="icon"
                    title="Browse R2 audio files"
                    onClick={() => setShowR2Browse(true)}
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a URL, upload an MP3, use the wand to auto-map, or browse R2 files.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Question Text (optional)</Label>
                <Input
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  placeholder="e.g., Choose The Chord"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editingQuestion.points}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseFloat(e.target.value) || 1 })}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answers</Label>
                  <Button variant="outline" size="sm" onClick={addAnswer}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Answer
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {editingQuestion.answers.map((answer, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={answer.answer_text}
                        onChange={(e) => updateAnswer(idx, 'answer_text', e.target.value)}
                        placeholder="Answer text"
                        className="flex-1"
                      />
                      <Button
                        variant={answer.is_correct ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateAnswer(idx, 'is_correct', true)}
                        className={cn(
                          answer.is_correct && "bg-green-600 hover:bg-green-700"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      {editingQuestion.answers.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAnswer(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the check icon to mark the correct answer.
                </p>
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => {
                  setEditingQuestion(null);
                  setPlayingAudioUrl(null);
                  audioPreviewRef.current?.pause();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => saveQuestionMutation.mutate(editingQuestion)}
                  disabled={
                    saveQuestionMutation.isPending ||
                    !editingQuestion.answers.some(a => a.is_correct) ||
                    editingQuestion.answers.some(a => !a.answer_text.trim())
                  }
                >
                  Save Question
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'test' ? 'Test' : 'Question'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'test'
                ? 'This will delete the entire test including all questions and user attempts. This cannot be undone.'
                : 'This will delete the question and all its answers. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.type === 'test') {
                  deleteTestMutation.mutate();
                } else if (deleteTarget?.type === 'question') {
                  deleteQuestionMutation.mutate(deleteTarget.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* R2 Browse Modal */}
      <R2BrowseModal
        open={showR2Browse}
        onOpenChange={setShowR2Browse}
        questionLabel={editingQuestion?.id ? `Q: ${editingQuestion.question_text || 'Audio question'}` : undefined}
        onSelect={async (url, key) => {
          if (!editingQuestion) return;

          // If question exists in DB, save directly
          if (editingQuestion.id) {
            try {
              const { error } = await supabase
                .from('test_questions')
                .update({ audio_url: url })
                .eq('id', editingQuestion.id);

              if (error) throw error;

              queryClient.invalidateQueries({ queryKey: ['admin-lesson-test', lessonId] });
              queryClient.invalidateQueries({ queryKey: ['admin-tests-with-audio'] });
              queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
              toast.success('Audio URL saved to database!');
            } catch (err: any) {
              toast.error(err.message || 'Failed to save audio URL');
            }
          }

          // Update local editing state so user sees it immediately
          setEditingQuestion({ ...editingQuestion, audio_url: url });
          setShowR2Browse(false);
        }}
      />
    </div>
  );
}
