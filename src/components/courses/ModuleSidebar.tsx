import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle2, 
  BookOpen, 
  Headphones, 
  FileText,
  Clock,
  ChevronRight,
  X,
  Gamepad2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CourseModule, ModuleLesson } from '@/types/course';

interface ModuleSidebarProps {
  module: CourseModule | null;
  completedLessons: Set<string>;
  onLessonSelect: (lessonId: string) => void;
  onPracticeSelect: (type: 'rhythm' | 'ear_training') => void;
  onClose: () => void;
  selectedLessonId?: string;
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Play,
  reading: BookOpen,
  listening: Headphones,
  assignment: FileText
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ModuleSidebar({
  module,
  completedLessons,
  onLessonSelect,
  onPracticeSelect,
  onClose,
  selectedLessonId
}: ModuleSidebarProps) {
  if (!module) return null;

  const lessons = module.lessons || [];
  const completedCount = lessons.filter(l => completedLessons.has(l.id)).length;
  const progress = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="w-full max-w-md bg-card border-l border-border h-full flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Module {module.order_index + 1}
              </p>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {module.title}
              </h2>
              {module.region_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  {module.region_name}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount}/{lessons.length} lessons</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Lessons list */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {lessons.map((lesson, index) => {
              const Icon = LESSON_ICONS[lesson.lesson_type] || Play;
              const isCompleted = completedLessons.has(lesson.id);
              const isSelected = selectedLessonId === lesson.id;

              return (
                <motion.button
                  key={lesson.id}
                  onClick={() => onLessonSelect(lesson.id)}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-all duration-200",
                    "border hover:border-primary/50",
                    isSelected 
                      ? "bg-primary/10 border-primary" 
                      : "bg-background border-border hover:bg-muted/50"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      isCompleted 
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-medium text-sm leading-tight",
                        isCompleted && "text-muted-foreground"
                      )}>
                        {lesson.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">
                          {lesson.lesson_type}
                        </span>
                        {lesson.duration_seconds && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(lesson.duration_seconds)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={cn(
                      "w-5 h-5 shrink-0 transition-transform",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Practice Stations */}
          <div className="p-4 pt-2">
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Side Quests
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => onPracticeSelect('rhythm')}
                >
                  <span className="text-lg">🥁</span>
                  <span className="text-xs">Rhythm</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => onPracticeSelect('ear_training')}
                >
                  <span className="text-lg">👂</span>
                  <span className="text-xs">Ear Training</span>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
