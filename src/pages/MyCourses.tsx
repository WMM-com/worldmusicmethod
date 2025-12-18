import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Play, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function MyCourses() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses:course_id (
            id,
            title,
            description,
            country,
            cover_image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get progress for each course
  const { data: progressData } = useQuery({
    queryKey: ['my-course-progress', user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id, completed, module_lessons!inner(module_id, course_modules!inner(course_id))')
        .eq('user_id', user.id)
        .eq('completed', true);
      
      if (error) throw error;
      
      // Group by course
      const progress: Record<string, number> = {};
      data?.forEach((item: any) => {
        const courseId = item.module_lessons?.course_modules?.course_id;
        if (courseId) {
          progress[courseId] = (progress[courseId] || 0) + 1;
        }
      });
      
      return progress;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <h1 className="text-3xl mb-2">My Courses</h1>
            <p className="text-muted-foreground">
              Continue learning where you left off
            </p>
          </div>
        </header>

        {/* Course grid */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          {enrollments && enrollments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment: any, i) => {
                const course = enrollment.courses;
                const completedLessons = progressData?.[course.id] || 0;
                const progressPercent = Math.min(completedLessons * 10, 100); // Rough estimate
                
                return (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card
                      className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300"
                      onClick={() => navigate(`/courses/${course.id}/learn`)}
                    >
                      {/* Cover image */}
                      <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-primary/30" />
                          </div>
                        )}
                        
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                            <Play className="h-8 w-8 text-primary-foreground ml-1" />
                          </div>
                        </div>

                        {/* Country badge */}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-background/90 backdrop-blur rounded-full text-sm font-medium">
                          {course.country}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        
                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {progressPercent === 100 ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-success" />
                                <span className="text-success">Completed</span>
                              </>
                            ) : (
                              <span>Continue learning</span>
                            )}
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No enrolled courses yet</h2>
              <p className="text-muted-foreground mb-6">
                Browse our courses and start your learning journey
              </p>
              <button
                onClick={() => navigate('/courses')}
                className="text-secondary hover:underline font-medium"
              >
                Explore Courses →
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
