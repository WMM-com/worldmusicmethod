import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Map as MapIcon, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CourseMap } from '@/components/courses/CourseMap';
import { ModuleSidebar } from '@/components/courses/ModuleSidebar';
import { LessonView } from '@/components/courses/LessonView';
import { CourseStats } from '@/components/courses/CourseStats';
import { RhythmTrainer } from '@/components/courses/practice/RhythmTrainer';
import { EarTrainer } from '@/components/courses/practice/EarTrainer';
import { 
  useCourse, 
  useUserCourseProgress, 
  useUserCourseStats 
} from '@/hooks/useCourses';
import { cn } from '@/lib/utils';

type ViewMode = 'map' | 'list';
type PracticeType = 'rhythm' | 'ear_training' | null;

export default function Course() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [practiceType, setPracticeType] = useState<PracticeType>(null);
  
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: progress = [] } = useUserCourseProgress(courseId);
  const { data: stats } = useUserCourseStats(courseId);

  const completedLessons = useMemo(() => {
    return new Set(progress.filter(p => p.completed).map(p => p.lesson_id));
  }, [progress]);

  const totalLessonsPerModule = useMemo(() => {
    const map = new Map<string, number>();
    course?.modules?.forEach(m => {
      map.set(m.id, m.lessons?.length || 0);
    });
    return map;
  }, [course]);

  const totalLessons = useMemo(() => {
    return course?.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  }, [course]);

  const selectedModule = useMemo(() => {
    return course?.modules?.find(m => m.id === selectedModuleId) || null;
  }, [course, selectedModuleId]);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId || !selectedModule) return null;
    return selectedModule.lessons?.find(l => l.id === selectedLessonId) || null;
  }, [selectedModule, selectedLessonId]);

  const allLessons = useMemo(() => {
    return course?.modules?.flatMap(m => m.lessons || []) || [];
  }, [course]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLessonId) return -1;
    return allLessons.findIndex(l => l.id === selectedLessonId);
  }, [allLessons, selectedLessonId]);

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
  };

  const handleNavigateLesson = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? currentLessonIndex - 1 
      : currentLessonIndex + 1;
    
    if (newIndex >= 0 && newIndex < allLessons.length) {
      const newLesson = allLessons[newIndex];
      // Find which module this lesson belongs to
      const newModule = course?.modules?.find(m => 
        m.lessons?.some(l => l.id === newLesson.id)
      );
      if (newModule) {
        setSelectedModuleId(newModule.id);
        setSelectedLessonId(newLesson.id);
      }
    }
  };

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-[600px] w-full max-w-2xl mx-auto rounded-3xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Course not found</h1>
          <Button onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">{course.title}</h1>
              <p className="text-sm text-muted-foreground">{course.country}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CourseStats 
              stats={stats} 
              totalLessons={totalLessons}
              completedLessons={completedLessons.size}
            />

            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - 3 column layout */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Map / List view - main area */}
        <motion.div 
          className={cn(
            "flex-1 p-6 overflow-auto transition-all duration-300",
            selectedLessonId ? "hidden lg:block lg:flex-1" : "flex-1"
          )}
        >
          {viewMode === 'map' ? (
            <CourseMap
              modules={course.modules || []}
              completedLessons={completedLessons}
              totalLessonsPerModule={totalLessonsPerModule}
              onModuleSelect={handleModuleSelect}
              selectedModuleId={selectedModuleId || undefined}
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {course.modules?.map((module, i) => (
                <motion.button
                  key={module.id}
                  onClick={() => handleModuleSelect(module.id)}
                  className={cn(
                    "w-full p-4 rounded-xl text-left border transition-all",
                    selectedModuleId === module.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {module.lessons?.length || 0} lessons
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Module sidebar - shows when module selected */}
        <AnimatePresence>
          {selectedModuleId && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={cn(
                "border-l border-border overflow-hidden",
                selectedLessonId ? "hidden lg:block" : "block"
              )}
            >
              <ModuleSidebar
                module={selectedModule}
                completedLessons={completedLessons}
                onLessonSelect={handleLessonSelect}
                onPracticeSelect={setPracticeType}
                onClose={() => setSelectedModuleId(null)}
                selectedLessonId={selectedLessonId || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lesson view - expands when lesson selected */}
        <AnimatePresence>
          {selectedLesson && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 lg:flex-[2] border-l border-border overflow-auto"
            >
              <div className="lg:hidden p-4 border-b border-border flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedLessonId(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <span className="text-sm text-muted-foreground truncate">
                  {selectedModule?.title}
                </span>
              </div>
              <LessonView
                lesson={selectedLesson}
                courseId={courseId!}
                isCompleted={completedLessons.has(selectedLesson.id)}
                onNavigate={handleNavigateLesson}
                hasPrev={currentLessonIndex > 0}
                hasNext={currentLessonIndex < allLessons.length - 1}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Practice modals */}
      <Dialog open={practiceType === 'rhythm'} onOpenChange={() => setPracticeType(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <RhythmTrainer 
            courseId={courseId} 
            onClose={() => setPracticeType(null)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={practiceType === 'ear_training'} onOpenChange={() => setPracticeType(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <EarTrainer 
            courseId={courseId} 
            onClose={() => setPracticeType(null)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
