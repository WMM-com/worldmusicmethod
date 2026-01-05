import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Play, CheckCircle, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ProgressInfo = {
  completedCounts: Record<string, number>;
  lastActivityByCourse: Record<string, string>;
};

type CourseCardVM = {
  enrollment: any;
  course: any;
  completedLessons: number;
  totalLessons: number | null;
  progressPercent: number;
  lastActivityAt: string | null;
};

export default function MyCourses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

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

      const courseIds = (data || [])
        .map((row: any) => row.courses?.id)
        .filter(Boolean);

      if (!courseIds.length) return data || [];

      // "Course Image" lives in the landing page builder
      const { data: landingPages, error: lpError } = await supabase
        .from('course_landing_pages')
        .select('course_id, course_image_url')
        .in('course_id', courseIds);

      if (lpError) throw lpError;

      return (data || []).map((enrollment: any) => {
        const course = enrollment.courses;
        const landingPage = landingPages?.find(lp => lp.course_id === course?.id);

        return {
          ...enrollment,
          courses: {
            ...course,
            cover_image_url: landingPage?.course_image_url || course?.cover_image_url,
          },
        };
      });
    },
    enabled: !!user,
  });

  const courseIds = useMemo(() => {
    return (enrollments || [])
      .map((e: any) => e.courses?.id)
      .filter(Boolean);
  }, [enrollments]);

  const { data: lessonCountsByCourse } = useQuery({
    queryKey: ['my-course-lesson-counts', user?.id, courseIds],
    queryFn: async () => {
      if (!user || courseIds.length === 0) return {} as Record<string, number>;

      const { data: modules, error: modErr } = await supabase
        .from('course_modules')
        .select('id, course_id')
        .in('course_id', courseIds);

      if (modErr) throw modErr;

      const moduleToCourse = new Map<string, string>();
      (modules || []).forEach((m: any) => moduleToCourse.set(m.id, m.course_id));

      const moduleIds = (modules || []).map((m: any) => m.id);
      if (moduleIds.length === 0) return {} as Record<string, number>;

      const { data: lessons, error: lessonErr } = await supabase
        .from('module_lessons')
        .select('id, module_id')
        .in('module_id', moduleIds);

      if (lessonErr) throw lessonErr;

      const counts: Record<string, number> = {};
      (lessons || []).forEach((l: any) => {
        const courseId = moduleToCourse.get(l.module_id);
        if (!courseId) return;
        counts[courseId] = (counts[courseId] || 0) + 1;
      });

      return counts;
    },
    enabled: !!user && courseIds.length > 0,
  });

  const { data: progressInfo } = useQuery({
    queryKey: ['my-course-progress', user?.id],
    queryFn: async () => {
      if (!user) return { completedCounts: {}, lastActivityByCourse: {} } as ProgressInfo;

      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('completed, updated_at, module_lessons!inner(module_id, course_modules!inner(course_id))')
        .eq('user_id', user.id);

      if (error) throw error;

      const completedCounts: Record<string, number> = {};
      const lastActivityByCourse: Record<string, string> = {};

      data?.forEach((item: any) => {
        const courseId = item.module_lessons?.course_modules?.course_id;
        if (!courseId) return;

        if (item.completed) {
          completedCounts[courseId] = (completedCounts[courseId] || 0) + 1;
        }

        const ts = item.updated_at as string | undefined;
        if (ts) {
          const prev = lastActivityByCourse[courseId];
          if (!prev || new Date(ts).getTime() > new Date(prev).getTime()) {
            lastActivityByCourse[courseId] = ts;
          }
        }
      });

      return { completedCounts, lastActivityByCourse } as ProgressInfo;
    },
    enabled: !!user,
  });

  const courseCards: CourseCardVM[] = useMemo(() => {
    const completedCounts = progressInfo?.completedCounts || {};
    const lastActivityByCourse = progressInfo?.lastActivityByCourse || {};

    return (enrollments || [])
      .map((enrollment: any) => {
        const course = enrollment.courses;
        if (!course?.id) return null;

        const completedLessons = completedCounts[course.id] || 0;
        const totalLessons = lessonCountsByCourse?.[course.id] ?? null;
        const progressPercent = totalLessons && totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        const lastActivityAt = lastActivityByCourse[course.id] || null;

        return {
          enrollment,
          course,
          completedLessons,
          totalLessons,
          progressPercent,
          lastActivityAt,
        };
      })
      .filter(Boolean) as CourseCardVM[];
  }, [enrollments, lessonCountsByCourse, progressInfo]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    if (!normalizedSearch) return courseCards;
    return courseCards.filter((c) => (c.course.title || '').toLowerCase().includes(normalizedSearch));
  }, [courseCards, normalizedSearch]);

  const continueCards = useMemo(() => {
    // "In progress" = started but not finished
    const inProgress = filteredCards.filter((c) => c.progressPercent > 0 && c.progressPercent < 100);
    return inProgress
      .sort((a, b) => {
        const aT = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bT = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bT - aT;
      })
      .slice(0, 3);
  }, [filteredCards]);

  const remainingCards = useMemo(() => {
    const continueIds = new Set(continueCards.map((c) => c.course.id));
    return filteredCards
      .filter((c) => !continueIds.has(c.course.id))
      .sort((a, b) => (a.course.title || '').localeCompare(b.course.title || ''));
  }, [continueCards, filteredCards]);

  const renderCourseCard = (card: CourseCardVM, i: number) => {
    const { enrollment, course, progressPercent } = card;

    return (
      <motion.div
        key={enrollment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
      >
        <Card
          className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300"
          onClick={() => navigate(`/courses/${course.id}/learn`)}
        >
          {/* Course Image */}
          <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
            {course.cover_image_url && (
              <img
                src={course.cover_image_url}
                alt={`${course.title} course cover`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            )}

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Play className="h-8 w-8 text-primary-foreground ml-1" />
              </div>
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
  };

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
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl mb-2">My Courses</h1>
              <p className="text-muted-foreground">Continue learning where you left off</p>
            </div>

            <div className="w-full sm:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your courses..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Course grid */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          {filteredCards.length > 0 ? (
            <div className="space-y-10">
              {continueCards.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Continue</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {continueCards.map(renderCourseCard)}
                  </div>
                </section>
              )}

              <section>
                {continueCards.length > 0 && <h2 className="text-lg font-semibold mb-4">All Courses</h2>}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingCards.map(renderCourseCard)}
                </div>
              </section>
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="text-center py-20">
              <h2 className="text-xl font-semibold mb-2">No matches</h2>
              <p className="text-muted-foreground">Try a different search.</p>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No enrolled courses yet</h2>
              <p className="text-muted-foreground mb-6">Browse our courses and start your learning journey</p>
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
