import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CourseSidebar } from '@/components/courses/CourseSidebar';
import { CourseDashboard } from '@/components/courses/CourseDashboard';
import { ModuleOverview } from '@/components/courses/ModuleOverview';
import { LessonView } from '@/components/courses/LessonView';
import { RhythmTrainer } from '@/components/courses/practice/RhythmTrainer';
import { EarTrainer } from '@/components/courses/practice/EarTrainer';
import { 
  useCourse, 
  useUserCourseProgress, 
  useUserCourseStats 
} from '@/hooks/useCourses';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type ViewState = 'dashboard' | 'module' | 'lesson';
type PracticeType = 'rhythm' | 'ear_training' | null;

export default function Course() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [viewState, setViewState] = useState<ViewState>('dashboard');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [practiceType, setPracticeType] = useState<PracticeType>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: progress = [] } = useUserCourseProgress(courseId);
  const { data: stats } = useUserCourseStats(courseId);

  const completedLessons = useMemo(() => {
    return new Set(progress.filter(p => p.completed).map(p => p.lesson_id));
  }, [progress]);

  const modules = course?.modules || [];

  const selectedModule = useMemo(() => {
    return modules.find(m => m.id === selectedModuleId) || null;
  }, [modules, selectedModuleId]);

  const selectedModuleIndex = useMemo(() => {
    return modules.findIndex(m => m.id === selectedModuleId);
  }, [modules, selectedModuleId]);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId || !selectedModule) return null;
    return selectedModule.lessons?.find(l => l.id === selectedLessonId) || null;
  }, [selectedModule, selectedLessonId]);

  const allLessons = useMemo(() => {
    return modules.flatMap(m => m.lessons || []);
  }, [modules]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLessonId) return -1;
    return allLessons.findIndex(l => l.id === selectedLessonId);
  }, [allLessons, selectedLessonId]);

  // Find first incomplete lesson
  const findNextLesson = () => {
    for (const module of modules) {
      const lesson = (module.lessons || []).find(l => !completedLessons.has(l.id));
      if (lesson) return { module, lesson };
    }
    return null;
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setViewState('module');
    setSidebarOpen(false);
  };

  const handleLessonSelect = (moduleId: string, lessonId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    setViewState('lesson');
    setSidebarOpen(false);
  };

  const handleStartLearning = () => {
    const next = findNextLesson();
    if (next) {
      handleLessonSelect(next.module.id, next.lesson.id);
    }
  };

  const handleBackToDashboard = () => {
    setViewState('dashboard');
    setSelectedModuleId(null);
    setSelectedLessonId(null);
  };

  const handleNavigateLesson = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? currentLessonIndex - 1 
      : currentLessonIndex + 1;
    
    if (newIndex >= 0 && newIndex < allLessons.length) {
      const newLesson = allLessons[newIndex];
      const newModule = modules.find(m => 
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

  const sidebarContent = (
    <CourseSidebar
      modules={modules}
      completedLessons={completedLessons}
      currentModuleId={selectedModuleId}
      currentLessonId={selectedLessonId}
      onModuleSelect={handleModuleSelect}
      onLessonSelect={handleLessonSelect}
      courseTitle={course.title}
      stats={stats}
    />
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Site header */}
      <SiteHeader />
      
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-80 flex-shrink-0 border-r border-border h-[calc(100vh-4rem)] sticky top-16 overflow-hidden">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile sidebar */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-80">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <div className="sticky top-0 z-40 border-b border-border bg-white px-4 py-3 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5 text-gray-900" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-gray-900">{course.title}</p>
              </div>
            </div>
          )}

          {/* Desktop back button */}
          {viewState !== 'dashboard' && (
            <div className="p-4 border-b border-gray-200">
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Course Dashboard
              </Button>
            </div>
          )}

        <AnimatePresence mode="wait">
          {/* Dashboard view */}
          {viewState === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CourseDashboard
                course={course}
                stats={stats}
                completedLessons={completedLessons}
                onStartLearning={handleStartLearning}
                onModuleSelect={handleModuleSelect}
              />
            </motion.div>
          )}

          {/* Module overview */}
          {viewState === 'module' && selectedModule && (
            <motion.div
              key="module"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ModuleOverview
                module={selectedModule}
                moduleIndex={selectedModuleIndex}
                completedLessons={completedLessons}
                onLessonSelect={(lessonId) => handleLessonSelect(selectedModule.id, lessonId)}
                onStartModule={() => {
                  const lesson = (selectedModule.lessons || []).find(l => !completedLessons.has(l.id)) 
                    || selectedModule.lessons?.[0];
                  if (lesson) handleLessonSelect(selectedModule.id, lesson.id);
                }}
              />
            </motion.div>
          )}

          {/* Lesson view */}
          {viewState === 'lesson' && selectedLesson && (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
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
      </main>

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
    </div>
  );
}
