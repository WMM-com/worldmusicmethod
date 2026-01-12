import { motion } from 'framer-motion';
import { Target, CheckCircle2, BookOpen, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseWithModules } from '@/types/course';

interface CourseDashboardProps {
  course: CourseWithModules;
  completedLessons: Set<string>;
  onStartLearning: () => void;
  onModuleSelect: (moduleId: string) => void;
}

export function CourseDashboard({
  course,
  completedLessons,
  onStartLearning,
  onModuleSelect
}: CourseDashboardProps) {
  const modules = course.modules || [];
  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const completedCount = completedLessons.size;
  const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  const totalDuration = modules.reduce((sum, m) => 
    sum + (m.lessons || []).reduce((s, l) => s + (l.duration_seconds || 0), 0), 0
  );
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  // Find next incomplete module/lesson
  const findNextLesson = () => {
    for (const module of modules) {
      const lesson = (module.lessons || []).find(l => !completedLessons.has(l.id));
      if (lesson) return { module, lesson };
    }
    return null;
  };
  const next = findNextLesson();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 sm:space-y-8"
      >
        {/* Hero section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-white border border-gray-200 p-8">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">{course.title}</h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              {course.description || `Explore the rich musical traditions of ${course.country}`}
            </p>

            {/* Progress summary */}
            <div className="mt-6 space-y-2 max-w-md">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-gray-500">
                {completedCount} of {totalLessons} lessons completed
              </p>
            </div>

            {/* CTA */}
            {next && (
              <Button size="lg" onClick={onStartLearning} className="mt-6">
                <Play className="w-4 h-4 mr-2" />
                {completedCount > 0 ? 'Continue Learning' : 'Start Course'}
              </Button>
            )}
          </div>
        </div>


        {/* Continue where you left off */}
        {next && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                <Target className="w-5 h-5 text-primary" />
                Continue Where You Left Off
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => onModuleSelect(next.module.id)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Play className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{next.module.title}</p>
                  <p className="font-medium text-gray-900">{next.lesson.title}</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Modules overview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Course Modules</h2>
          <div className="grid gap-4">
            {modules.map((module, index) => {
              const lessons = module.lessons || [];
              const completed = lessons.filter(l => completedLessons.has(l.id)).length;
              const isComplete = completed === lessons.length && lessons.length > 0;
              const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;

              return (
                <button
                  key={module.id}
                  onClick={() => onModuleSelect(module.id)}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors text-left w-full overflow-hidden"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 flex items-center justify-center text-base sm:text-lg font-bold ${
                    isComplete 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : index + 1}
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <h3 className="font-medium text-white text-sm sm:text-base break-words">{module.title}</h3>
                      {module.region_name && (
                        <span className="text-xs text-gray-300 bg-gray-700 px-2 py-0.5 rounded-full w-fit flex-shrink-0">
                          {module.region_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 mt-1">
                      <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                        {completed}/{lessons.length} lessons
                      </span>
                      <Progress value={progress} className="h-1.5 flex-1 max-w-24 sm:max-w-32" />
                    </div>
                  </div>

                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 hidden sm:block" />
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
