import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  LessonTest, 
  TestQuestion, 
  TestAnswer, 
  LessonTestWithQuestions,
  UserTestAttempt,
  QuestionResult
} from '@/types/test';

// Fetch a test by lesson ID
export function useTestByLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson-test', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data: test, error } = await supabase
        .from('lesson_tests')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!test) return null;
      
      // Fetch questions
      const { data: questions, error: qError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', test.id)
        .order('order_index');
      
      if (qError) throw qError;
      
      // Fetch answers for all questions
      const questionIds = questions?.map(q => q.id) || [];
      const { data: answers, error: aError } = await supabase
        .from('test_answers')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index');
      
      if (aError) throw aError;
      
      // Combine questions with their answers
      const questionsWithAnswers = questions?.map(q => ({
        ...q,
        answers: answers?.filter(a => a.question_id === q.id) || []
      })) || [];
      
      return {
        ...test,
        questions: questionsWithAnswers
      } as LessonTestWithQuestions;
    },
    enabled: !!lessonId
  });
}

// Fetch user's best attempt for a test
export function useUserTestAttempt(testId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-test-attempt', testId, user?.id],
    queryFn: async () => {
      if (!testId || !user) return null;
      
      const { data, error } = await supabase
        .from('user_test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .order('percentage', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        question_results: data.question_results as unknown as QuestionResult[]
      } as UserTestAttempt;
    },
    enabled: !!testId && !!user
  });
}

// Submit a test attempt
export function useSubmitTestAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      testId, 
      score, 
      maxScore, 
      questionResults 
    }: { 
      testId: string; 
      score: number; 
      maxScore: number;
      questionResults: QuestionResult[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      
      const { data, error } = await supabase
        .from('user_test_attempts')
        .insert([{
          user_id: user.id,
          test_id: testId,
          score,
          max_score: maxScore,
          percentage,
          question_results: questionResults as unknown as any,
          completed_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-test-attempt', variables.testId] });
    }
  });
}

// Admin: Create a new test
export function useCreateTest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (test: Omit<LessonTest, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lesson_tests')
        .insert(test)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test', variables.lesson_id] });
    }
  });
}

// Admin: Update a test
export function useUpdateTest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LessonTest> & { id: string }) => {
      const { data, error } = await supabase
        .from('lesson_tests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test', data.lesson_id] });
    }
  });
}

// Admin: Delete a test
export function useDeleteTest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from('lesson_tests')
        .delete()
        .eq('id', testId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Create a question
export function useCreateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: Omit<TestQuestion, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_questions')
        .insert(question)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Update a question
export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Delete a question
export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('test_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Create an answer
export function useCreateAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (answer: Omit<TestAnswer, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('test_answers')
        .insert(answer)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Update an answer
export function useUpdateAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestAnswer> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_answers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Delete an answer
export function useDeleteAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (answerId: string) => {
      const { error } = await supabase
        .from('test_answers')
        .delete()
        .eq('id', answerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}

// Admin: Bulk create questions with answers
export function useBulkCreateQuestions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      testId, 
      questions 
    }: { 
      testId: string; 
      questions: Array<{
        question_text?: string;
        audio_url?: string;
        order_index: number;
        points?: number;
        answers: Array<{
          answer_text: string;
          is_correct: boolean;
          order_index: number;
        }>;
      }>;
    }) => {
      for (const q of questions) {
        // Insert question
        const { data: question, error: qError } = await supabase
          .from('test_questions')
          .insert({
            test_id: testId,
            question_text: q.question_text || null,
            audio_url: q.audio_url || null,
            order_index: q.order_index,
            points: q.points || 1
          })
          .select()
          .single();
        
        if (qError) throw qError;
        
        // Insert answers
        const answersToInsert = q.answers.map(a => ({
          question_id: question.id,
          answer_text: a.answer_text,
          is_correct: a.is_correct,
          order_index: a.order_index
        }));
        
        const { error: aError } = await supabase
          .from('test_answers')
          .insert(answersToInsert);
        
        if (aError) throw aError;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-test'] });
    }
  });
}
