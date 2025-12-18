import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Map as MapIcon, X } from 'lucide-react';
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

type ViewState = 'map' | 'module' | 'lesson';
type PracticeType = 'rhythm' | 'ear_training' | null;

export default function Course() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [viewState, setViewState] = useState<ViewState>('map');
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
    setViewState('module');
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setViewState('lesson');
  };

  const handleBackToMap = () => {
    setViewState('map');
    setSelectedModuleId(null);
    setSelectedLessonId(null);
  };

  const handleBackToModule = () => {
    setViewState('module');
    setSelectedLessonId(null);
  };

  const handleNavigateLesson = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? currentLessonIndex - 1 
      : currentLessonIndex + 1;
    
    if (newIndex >= 0 && newIndex < allLessons.length) {
      const newLesson = allLessons[newIndex];
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
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
      {/* MAP VIEW - Full screen immersive */}
      <AnimatePresence mode="wait">
        {viewState === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Back button overlay */}
            <div className="fixed top-4 left-4 z-50">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => navigate('/courses')}
                className="bg-background/80 backdrop-blur-sm border border-border"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Courses
              </Button>
            </div>

            {/* Stats overlay */}
            <div className="fixed top-4 right-4 z-50">
              <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2">
                <CourseStats 
                  stats={stats} 
                  totalLessons={totalLessons}
                  completedLessons={completedLessons.size}
                />
              </div>
            </div>

            <CourseMap
              modules={course.modules || []}
              completedLessons={completedLessons}
              totalLessonsPerModule={totalLessonsPerModule}
              onModuleSelect={handleModuleSelect}
              courseTitle={course.title}
              courseCountry={course.country}
            />
          </motion.div>
        )}

        {/* MODULE VIEW - Full screen module details */}
        {viewState === 'module' && selectedModule && (
          <motion.div
            key="module"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen"
          >
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBackToMap}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBackToMap}
                      className="gap-2"
                    >
                      <MapIcon className="w-4 h-4" />
                      Map
                    </Button>
                    <div>
                      <h1 className="font-bold text-lg">{selectedModule.title}</h1>
                      <p className="text-sm text-muted-foreground">
                        {selectedModule.lessons?.length || 0} lessons
                      </p>
                    </div>
                  </div>
                </div>

                <CourseStats 
                  stats={stats} 
                  totalLessons={totalLessons}
                  completedLessons={completedLessons.size}
                />
              </div>
            </header>

            {/* Module content - centered */}
            <div className="max-w-2xl mx-auto p-6">
              <ModuleSidebar
                module={selectedModule}
                completedLessons={completedLessons}
                onLessonSelect={handleLessonSelect}
                onPracticeSelect={setPracticeType}
                onClose={handleBackToMap}
                selectedLessonId={selectedLessonId || undefined}
                embedded
              />
            </div>
          </motion.div>
        )}

        {/* LESSON VIEW - Full screen lesson content */}
        {viewState === 'lesson' && selectedLesson && (
          <motion.div
            key="lesson"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen"
          >
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBackToModule}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBackToMap}
                      className="gap-2"
                    >
                      <MapIcon className="w-4 h-4" />
                      Map
                    </Button>
                    <div>
                      <p className="text-xs text-muted-foreground">{selectedModule?.title}</p>
                      <h1 className="font-bold">{selectedLesson.title}</h1>
                    </div>
                  </div>
                </div>

                <CourseStats 
                  stats={stats} 
                  totalLessons={totalLessons}
                  completedLessons={completedLessons.size}
                />
              </div>
            </header>

            {/* Lesson content */}
            <div className="max-w-4xl mx-auto">
              <LessonView
                lesson={selectedLesson}
                courseId={courseId!}
                isCompleted={completedLessons.has(selectedLesson.id)}
                onNavigate={handleNavigateLesson}
                hasPrev={currentLessonIndex > 0}
                hasNext={currentLessonIndex < allLessons.length - 1}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
