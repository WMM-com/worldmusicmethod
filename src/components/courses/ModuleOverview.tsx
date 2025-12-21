import { motion } from 'framer-motion';
import { Play, CheckCircle2, Clock, BookOpen, Headphones, FileText } from 'lucide-react';
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

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  reading: BookOpen,
  listening: Headphones,
  assignment: FileText,
};

// Parse module description to extract sections
function parseModuleDescription(description: string | null) {
  if (!description) {
    return { intro: '', sections: [], youtubeUrls: [], spotifyUrls: [] };
  }

  const lines = description.split('\n');
  const sections: { title: string; content: string[] }[] = [];
  const youtubeUrls: string[] = [];
  const spotifyUrls: string[] = [];
  let intro: string[] = [];
  let currentSection: { title: string; content: string[] } | null = null;

  // Common section headers to detect
  const sectionHeaders = [
    'Learning Focus',
    'Context & References',
    'Cultural Context',
    'Suggested Listening',
    'References',
    'Overview',
    'About This Module',
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Extract YouTube URLs
    const youtubeMatch = trimmedLine.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      youtubeUrls.push(youtubeMatch[1]);
      continue;
    }

    // Extract Spotify URLs
    const spotifyMatch = trimmedLine.match(/(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
      spotifyUrls.push(`${spotifyMatch[1]}/${spotifyMatch[2]}`);
      continue;
    }

    // Check if this line is a section header
    const isHeader = sectionHeaders.some(header => 
      trimmedLine.toLowerCase().includes(header.toLowerCase()) && 
      trimmedLine.length < 50
    );

    if (isHeader) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title: trimmedLine, content: [] };
    } else if (currentSection) {
      // Add to current section
      if (trimmedLine) {
        currentSection.content.push(trimmedLine);
      }
    } else {
      // Add to intro
      if (trimmedLine) {
        intro.push(trimmedLine);
      }
    }
  }

  // Don't forget the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { intro: intro.join(' '), sections, youtubeUrls, spotifyUrls };
}

// Parse text for bold markers (** or __)
function parseTextWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// YouTube embed component - narrower than Soundslice
function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="max-w-2xl">
      <div className="aspect-video rounded-xl overflow-hidden border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// Spotify embed component
function SpotifyEmbed({ embedPath }: { embedPath: string }) {
  return (
    <div className="max-w-md">
      <iframe
        src={`https://open.spotify.com/embed/${embedPath}`}
        width="100%"
        height="152"
        allow="encrypted-media"
        className="rounded-xl"
      />
    </div>
  );
}

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
  
  // Parse the actual module description
  const { intro, sections, youtubeUrls, spotifyUrls } = parseModuleDescription(module.description);

  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  };

  // Find first incomplete lesson
  const nextLesson = lessons.find(l => !completedLessons.has(l.id));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 lg:px-8">
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
                <span>{module.region_name}</span>
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

        {/* Intro Description */}
        {intro && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed text-foreground/80">
              {intro}
            </p>
          </div>
        )}

        {/* Dynamic Sections from description */}
        {sections.map((section, idx) => {
          const isLearningFocus = section.title.toLowerCase().includes('learning focus');
          // For Learning Focus, treat all items as bullet points
          const shouldBullet = isLearningFocus && section.content.length > 1;
          
          return (
            <div key={idx} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className={cn(
                  "w-1 h-6 rounded-full",
                  idx % 2 === 0 ? "bg-primary" : "bg-amber-500"
                )} />
                {section.title}
              </h2>
              {section.content.length > 0 && (
                <div className={cn("space-y-3", shouldBullet && "pl-1")}>
                  {section.content.map((item, i) => {
                    // Check if it looks like a bullet point or should be bulleted
                    const isBullet = item.startsWith('•') || item.startsWith('-') || item.startsWith('*') || shouldBullet;
                    const cleanItem = (item.startsWith('•') || item.startsWith('-') || item.startsWith('*')) 
                      ? item.slice(1).trim() 
                      : item;
                    
                    if (isBullet) {
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0 mt-2" />
                          <span className="text-foreground/80">{parseTextWithBold(cleanItem)}</span>
                        </div>
                      );
                    }
                    
                    return (
                      <p key={i} className="text-foreground/80 leading-relaxed">
                        {parseTextWithBold(item)}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* YouTube Embeds */}
        {youtubeUrls.length > 0 && (
          <div className="space-y-4">
            {youtubeUrls.map((videoId, idx) => (
              <YouTubeEmbed key={idx} videoId={videoId} />
            ))}
          </div>
        )}

        {/* Spotify Embeds */}
        {spotifyUrls.length > 0 && (
          <div className="space-y-4">
            {spotifyUrls.map((embedPath, idx) => (
              <SpotifyEmbed key={idx} embedPath={embedPath} />
            ))}
          </div>
        )}

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
