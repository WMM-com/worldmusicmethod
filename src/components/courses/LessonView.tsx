import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  BookOpen, 
  Headphones, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMarkLessonComplete } from '@/hooks/useCourses';
import { toast } from 'sonner';
import { SoundsliceEmbed } from './SoundsliceEmbed';
import type { ModuleLesson } from '@/types/course';

interface LessonViewProps {
  lesson: ModuleLesson;
  courseId: string;
  isCompleted: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function LessonView({
  lesson,
  courseId,
  isCompleted,
  onNavigate,
  hasPrev,
  hasNext
}: LessonViewProps) {
  const [showXpGain, setShowXpGain] = useState(false);
  const markComplete = useMarkLessonComplete();

  const handleMarkComplete = async () => {
    try {
      const result = await markComplete.mutateAsync({ 
        lessonId: lesson.id, 
        courseId 
      });
      
      setShowXpGain(true);
      setTimeout(() => setShowXpGain(false), 2000);
      
      toast.success(`Lesson completed! +${result.xpGain} XP`);
    } catch (error) {
      toast.error('Failed to save progress');
    }
  };

  const listeningRefs = lesson.listening_references || [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="capitalize">{lesson.lesson_type}</span>
            {lesson.duration_seconds && (
              <>
                <span>•</span>
                <span>{Math.floor(lesson.duration_seconds / 60)} min</span>
              </>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {lesson.title}
          </h1>

          {isCompleted && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </div>
          )}
        </motion.div>

        {/* Soundslice Embed - if video_url is a short Soundslice ID (5-6 chars) */}
        {lesson.video_url && lesson.video_url.length <= 10 && !lesson.video_url.includes('/') && !lesson.video_url.includes('.') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SoundsliceEmbed 
              sliceIdOrUrl={lesson.video_url}
              preset="drum"
              height={500}
            />
          </motion.div>
        )}

        {/* Video Player - only for actual video URLs */}
        {lesson.video_url && (lesson.video_url.includes('/') || lesson.video_url.includes('.')) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              {lesson.video_url.includes('youtube') || lesson.video_url.includes('youtu.be') ? (
                <iframe
                  src={lesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : lesson.video_url.includes('vimeo') ? (
                <iframe
                  src={lesson.video_url.replace('vimeo.com', 'player.vimeo.com/video')}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={lesson.video_url}
                  controls
                  className="w-full h-full"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Content */}
        {lesson.content && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Lesson Notes</h2>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {lesson.content.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Listening References */}
        {listeningRefs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Headphones className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Suggested Listening</h2>
              </div>
              <div className="space-y-3">
                {listeningRefs.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{ref.title}</p>
                      <p className="text-xs text-muted-foreground">{ref.artist}</p>
                    </div>
                    {ref.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between gap-4 pt-4 border-t border-border"
        >
          <Button
            variant="outline"
            onClick={() => onNavigate('prev')}
            disabled={!hasPrev}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="relative">
            {!isCompleted && (
              <Button
                onClick={handleMarkComplete}
                disabled={markComplete.isPending}
                className="relative overflow-hidden"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
            
            {/* XP gain animation */}
            {showXpGain && (
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 1, 0], y: -40 }}
                transition={{ duration: 2 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-primary font-bold"
              >
                <Award className="w-4 h-4" />
                +25 XP
              </motion.div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => onNavigate('next')}
            disabled={!hasNext}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
