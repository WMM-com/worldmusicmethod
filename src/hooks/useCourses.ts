import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Course, 
  CourseModule, 
  ModuleLesson, 
  UserLessonProgress, 
  UserCourseStats,
  UserPracticeScore,
  CourseWithModules
} from '@/types/course';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      // Fetch courses with their landing page images
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('title', { ascending: true }); // Alphabetical order
      
      if (error) throw error;
      
      // Fetch landing page images
      const courseIds = courses?.map(c => c.id) || [];
      const { data: landingPages } = await supabase
        .from('course_landing_pages')
        .select('course_id, course_image_url')
        .in('course_id', courseIds);
      
      // Merge landing page images with courses
      return (courses || []).map(course => {
        const landingPage = landingPages?.find(lp => lp.course_id === course.id);
        return {
          ...course,
          // Use landing page image if available, otherwise keep original cover_image_url
          cover_image_url: landingPage?.course_image_url || course.cover_image_url
        };
      }) as Course[];
    }
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (courseError) throw courseError;

      const { data: modules, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');
      
      if (modulesError) throw modulesError;

      // Fetch lessons for each module
      const modulesWithLessons = await Promise.all(
        (modules as CourseModule[]).map(async (module) => {
          const { data: lessons } = await supabase
            .from('module_lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index');
          
          return {
            ...module,
            lessons: (lessons || []).map(l => ({
              ...l,
              lesson_type: l.lesson_type as ModuleLesson['lesson_type'],
              listening_references: (l.listening_references || []) as any[]
            })) as ModuleLesson[]
          };
        })
      );

      return {
        ...course,
        modules: modulesWithLessons
      } as CourseWithModules;
    },
    enabled: !!courseId
  });
}

export function useUserCourseProgress(courseId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['course-progress', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user) return [];
      
      // Get all lesson IDs for this course
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId);
      
      if (!modules?.length) return [];

      const moduleIds = modules.map(m => m.id);
      
      const { data: lessons } = await supabase
        .from('module_lessons')
        .select('id')
        .in('module_id', moduleIds);
      
      if (!lessons?.length) return [];

      const lessonIds = lessons.map(l => l.id);
      
      const { data: progress, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      
      if (error) throw error;
      return progress as UserLessonProgress[];
    },
    enabled: !!courseId && !!user
  });
}

export function useUserCourseStats(courseId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['course-stats', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user) return null;
      
      const { data, error } = await supabase
        .from('user_course_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        badges: (data.badges || []) as any[]
      } as UserCourseStats;
    },
    enabled: !!courseId && !!user
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Upsert progress
      const { error: progressError } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        });
      
      if (progressError) throw progressError;

      // Award XP and update stats
      const xpGain = 25;
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingStats } = await supabase
        .from('user_course_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (existingStats) {
        const lastActivity = existingStats.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        let newStreak = existingStats.streak_days;
        if (lastActivity === yesterdayStr) {
          newStreak += 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        }
        
        await supabase
          .from('user_course_stats')
          .update({
            xp: existingStats.xp + xpGain,
            streak_days: newStreak,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStats.id);
      } else {
        await supabase
          .from('user_course_stats')
          .insert({
            user_id: user.id,
            course_id: courseId,
            xp: xpGain,
            streak_days: 1,
            last_activity_date: today
          });
      }
      
      return { xpGain };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-stats', variables.courseId] });
    }
  });
}

export function useSavePracticeScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (score: Omit<UserPracticeScore, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_practice_scores')
        .insert({
          ...score,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Award XP based on score
      if (score.course_id) {
        const xpGain = Math.round((score.score / score.max_score) * 15);
        
        const { data: existingStats } = await supabase
          .from('user_course_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', score.course_id)
          .maybeSingle();
        
        if (existingStats) {
          await supabase
            .from('user_course_stats')
            .update({
              xp: existingStats.xp + xpGain,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStats.id);
        }
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['practice-scores'] });
      if (variables.course_id) {
        queryClient.invalidateQueries({ queryKey: ['course-stats', variables.course_id] });
      }
    }
  });
}

export function useUserPracticeScores(courseId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['practice-scores', courseId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('user_practice_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as UserPracticeScore[];
    },
    enabled: !!user
  });
}
