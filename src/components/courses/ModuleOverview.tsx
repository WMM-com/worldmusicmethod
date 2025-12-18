import { motion } from 'framer-motion';
import { Play, CheckCircle2, Clock, BookOpen, Headphones, FileText, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CourseModule, ModuleLesson } from '@/types/course';

interface ModuleOverviewProps {
  module: CourseModule;
  moduleIndex: number;
  completedLessons: Set<string>;
  onLessonSelect: (lessonId: string) => void;
  onStartModule: () => void;
}

// Module overview content (could come from DB in future)
const MODULE_CONTENT: Record<number, {
  description: string;
  learningFocus: string[];
  culturalContext: string;
}> = {
  0: {
    description: "Huayño is one of the most iconic styles of the Peruvian Andes, with deep Indigenous roots that date back centuries. Traditionally accompanied by flutes, violins, and percussion, Huayño's guitar adaptation brings out its bright, syncopated strumming patterns and melodic phrasing.",
    learningFocus: [
      "Develop Huayño strumming techniques and rhythmic precision.",
      "Understand syncopation and its role in Andean music.",
      "Learn a traditional Huayño melody and variations."
    ],
    culturalContext: "Huayño originated in Quechua and Aymara communities of the Andean highlands. It became a national symbol of Peruvian identity in the 20th century and remains one of the most widely performed folk styles across Bolivia, Ecuador, and Peru."
  }
};

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  reading: BookOpen,
  listening: Headphones,
  assignment: FileText,
};

export function ModuleOverview({
  module,
  moduleIndex,
  completedLessons,
  onLessonSelect,
  onStartModule
}: ModuleOverviewProps) {
  const lessons = module.lessons || [];
  const completedCount = lessons.filter(l => completedLessons.has(l.id)).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;
  const isComplete = completedCount === lessons.length && lessons.length > 0;
  
  // Get module content or use defaults
  const content = MODULE_CONTENT[moduleIndex] || {
    description: module.description || "Explore this module to discover new techniques and cultural insights.",
    learningFocus: ["Master the core techniques", "Understand the cultural context", "Apply your knowledge in practice"],
    culturalContext: "This style represents an important part of the musical tradition."
  };

  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  };

  // Find first incomplete lesson
  const nextLesson = lessons.find(l => !completedLessons.has(l.id));

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Module {moduleIndex + 1}
            </span>
            {module.region_name && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {module.region_name}
                </div>
              </>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold">{module.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{lessons.length} lessons</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(totalDuration)}</span>
            </div>
            {isComplete && (
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>Completed</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount}/{lessons.length}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* CTA */}
          {nextLesson && (
            <Button 
              size="lg" 
              onClick={onStartModule}
              className="mt-4"
            >
              <Play className="w-4 h-4 mr-2" />
              {completedCount > 0 ? 'Continue Learning' : 'Start Module'}
            </Button>
          )}
        </div>

        {/* Description */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-lg leading-relaxed text-foreground/80">
            {content.description}
          </p>
        </div>

        {/* Learning Focus */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Learning Focus
          </h2>
          <ul className="space-y-3">
            {content.learningFocus.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium">{i + 1}</span>
                </div>
                <span className="text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cultural Context */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full" />
            Cultural & Musical Context
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            {content.culturalContext}
          </p>
        </div>

        {/* Mini map placeholder - could show region */}
        <div className="rounded-xl overflow-hidden border border-border bg-muted/30 p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-amber-900/50 to-emerald-800/50 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-amber-200/70" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Region</p>
              <p className="font-medium">{module.region_name || 'Peruvian Andes'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Explore the musical traditions of this region
              </p>
            </div>
          </div>
        </div>

        {/* Lessons list */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Lessons in this module</h2>
          <div className="space-y-2">
            {lessons.map((lesson, i) => {
              const isCompleted = completedLessons.has(lesson.id);
              const LessonIcon = LESSON_ICONS[lesson.lesson_type] || BookOpen;

              return (
                <button
                  key={lesson.id}
                  onClick={() => onLessonSelect(lesson.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border border-border",
                    "transition-colors hover:bg-muted/50 text-left",
                    isCompleted && "bg-green-500/5 border-green-500/20"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isCompleted ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <LessonIcon className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      isCompleted && "text-muted-foreground"
                    )}>
                      {lesson.title}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {lesson.lesson_type}
                      {lesson.duration_seconds && ` • ${Math.floor(lesson.duration_seconds / 60)} min`}
                    </p>
                  </div>

                  <Play className="w-4 h-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
