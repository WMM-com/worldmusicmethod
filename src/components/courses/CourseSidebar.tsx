import { ChevronDown, ChevronRight, CheckCircle2, Circle, Lock, Play, BookOpen, Headphones, FileText, Trophy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { CourseModule, ModuleLesson } from '@/types/course';

interface CourseSidebarProps {
  modules: CourseModule[];
  completedLessons: Set<string>;
  currentModuleId: string | null;
  currentLessonId: string | null;
  onModuleSelect: (moduleId: string) => void;
  onLessonSelect: (moduleId: string, lessonId: string) => void;
  courseTitle: string;
  stats?: {
    xp: number;
    streak_days: number;
  } | null;
}

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  reading: BookOpen,
  listening: Headphones,
  assignment: FileText,
};

export function CourseSidebar({
  modules,
  completedLessons,
  currentModuleId,
  currentLessonId,
  onModuleSelect,
  onLessonSelect,
  courseTitle,
  stats
}: CourseSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(currentModuleId ? [currentModuleId] : [modules[0]?.id])
  );

  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    setExpandedModules(next);
  };

  const getModuleProgress = (module: CourseModule) => {
    const lessons = module.lessons || [];
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    return { completed, total: lessons.length };
  };

  const isModuleComplete = (module: CourseModule) => {
    const { completed, total } = getModuleProgress(module);
    return total > 0 && completed === total;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-lg truncate">{courseTitle}</h2>
        {stats && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{stats.xp} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔥</span>
              <span>{stats.streak_days} day streak</span>
            </div>
          </div>
        )}
      </div>

      {/* Modules list */}
      <div className="flex-1 overflow-y-auto">
        {modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.has(module.id);
          const isCurrentModule = module.id === currentModuleId;
          const moduleComplete = isModuleComplete(module);
          const progress = getModuleProgress(module);

          return (
            <div key={module.id} className="border-b border-border/50">
              {/* Module header */}
              <button
                onClick={() => {
                  toggleModule(module.id);
                  onModuleSelect(module.id);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 text-left transition-colors",
                  "hover:bg-muted/50",
                  isCurrentModule && !currentLessonId && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  moduleComplete 
                    ? "bg-green-500/20 text-green-500" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {moduleComplete ? <CheckCircle2 className="w-4 h-4" /> : moduleIndex + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium truncate",
                    isCurrentModule && "text-primary"
                  )}>
                    {module.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {progress.completed}/{progress.total} lessons
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Lessons list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {(module.lessons || []).map((lesson) => {
                        const isCompleted = completedLessons.has(lesson.id);
                        const isCurrent = lesson.id === currentLessonId;
                        const LessonIcon = LESSON_ICONS[lesson.lesson_type] || Circle;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => onLessonSelect(module.id, lesson.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 pl-8 text-left transition-colors",
                              "hover:bg-muted/50",
                              isCurrent && "bg-primary/10 border-l-2 border-primary"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                              isCompleted && "bg-green-500/20 text-green-500",
                              isCurrent && !isCompleted && "bg-primary/20 text-primary",
                              !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                            )}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <LessonIcon className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
                                isCurrent && "font-medium text-primary",
                                isCompleted && "text-muted-foreground"
                              )}>
                                {lesson.title}
                              </p>
                            </div>

                            {lesson.duration_seconds && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(lesson.duration_seconds)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
