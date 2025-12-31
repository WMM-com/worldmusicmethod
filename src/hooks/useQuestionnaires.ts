import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type QuestionType = 'multiple_choice' | 'rating' | 'text' | 'checkbox';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
}

export interface Questionnaire {
  id: string;
  group_id: string;
  channel_id: string | null;
  title: string;
  description: string | null;
  questions: Question[];
  is_active: boolean;
  is_pinned: boolean;
  allow_multiple_responses: boolean;
  ends_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  response_count?: number;
  user_has_responded?: boolean;
}

export interface QuestionnaireResponse {
  id: string;
  questionnaire_id: string;
  user_id: string;
  answers: Record<string, string | string[] | number>;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useGroupQuestionnaires(groupId: string, channelId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-questionnaires', groupId, channelId],
    queryFn: async () => {
      let query = supabase
        .from('group_questionnaires')
        .select('*')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      // Filter by channel if specified
      if (channelId !== undefined) {
        if (channelId) {
          query = query.eq('channel_id', channelId);
        } else {
          query = query.is('channel_id', null);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get response counts
      const questionnaireIds = data.map(q => q.id);
      const { data: responses } = await supabase
        .from('questionnaire_responses')
        .select('questionnaire_id, user_id')
        .in('questionnaire_id', questionnaireIds);
      
      const countMap = new Map<string, number>();
      const userResponseMap = new Set<string>();
      
      responses?.forEach(r => {
        countMap.set(r.questionnaire_id, (countMap.get(r.questionnaire_id) || 0) + 1);
        if (user && r.user_id === user.id) {
          userResponseMap.add(r.questionnaire_id);
        }
      });
      
      return data.map(q => ({
        ...q,
        questions: (q.questions as unknown) as Question[],
        response_count: countMap.get(q.id) || 0,
        user_has_responded: userResponseMap.has(q.id),
      })) as Questionnaire[];
    },
    enabled: !!groupId,
  });
}

export function useQuestionnaire(questionnaireId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['questionnaire', questionnaireId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_questionnaires')
        .select('*')
        .eq('id', questionnaireId)
        .single();
      
      if (error) throw error;
      
      // Check if user has responded
      let user_has_responded = false;
      if (user) {
        const { data: response } = await supabase
          .from('questionnaire_responses')
          .select('id')
          .eq('questionnaire_id', questionnaireId)
          .eq('user_id', user.id)
          .maybeSingle();
        user_has_responded = !!response;
      }
      
      return {
        ...data,
        questions: (data.questions as unknown) as Question[],
        user_has_responded,
      } as Questionnaire;
    },
    enabled: !!questionnaireId,
  });
}

export function useQuestionnaireResponses(questionnaireId: string) {
  return useQuery({
    queryKey: ['questionnaire-responses', questionnaireId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(r => ({
        ...r,
        answers: r.answers as Record<string, string | string[] | number>,
        profile: profileMap.get(r.user_id),
      })) as QuestionnaireResponse[];
    },
    enabled: !!questionnaireId,
  });
}

export function useCreateQuestionnaire() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      channel_id?: string;
      title: string;
      description?: string;
      questions: Question[];
      allow_multiple_responses?: boolean;
      ends_at?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const insertData = {
        group_id: data.group_id,
        channel_id: data.channel_id || null,
        title: data.title,
        description: data.description || null,
        questions: JSON.parse(JSON.stringify(data.questions)) as Json,
        allow_multiple_responses: data.allow_multiple_responses || false,
        ends_at: data.ends_at || null,
        created_by: user.id,
      };
      
      const { data: questionnaire, error } = await supabase
        .from('group_questionnaires')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return questionnaire;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-questionnaires', variables.group_id] });
      toast.success('Questionnaire created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSubmitQuestionnaireResponse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ questionnaireId, answers }: {
      questionnaireId: string;
      answers: Record<string, string | string[] | number>;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .upsert({
          questionnaire_id: questionnaireId,
          user_id: user.id,
          answers,
        }, {
          onConflict: 'questionnaire_id,user_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', data.questionnaire_id] });
      queryClient.invalidateQueries({ queryKey: ['group-questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire-responses', data.questionnaire_id] });
      toast.success('Response submitted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionnaireId, groupId, updates }: {
      questionnaireId: string;
      groupId: string;
      updates: Partial<{
        title: string;
        description: string | null;
        questions: Question[];
        allow_multiple_responses: boolean;
        is_active: boolean;
        is_pinned: boolean;
        ends_at: string | null;
      }>;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.questions) {
        updateData.questions = JSON.parse(JSON.stringify(updates.questions));
      }
      
      const { error } = await supabase
        .from('group_questionnaires')
        .update(updateData)
        .eq('id', questionnaireId);
      
      if (error) throw error;
      return questionnaireId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-questionnaires', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] });
      toast.success('Questionnaire updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionnaireId, groupId }: { questionnaireId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_questionnaires')
        .delete()
        .eq('id', questionnaireId);
      
      if (error) throw error;
      return questionnaireId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-questionnaires', variables.groupId] });
      toast.success('Questionnaire deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
