import { useMemo, useState } from 'react';
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

function extractYouTubeIds(text: string): string[] {
  const ids: string[] = [];
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!ids.includes(match[1])) ids.push(match[1]);
    }
  }
  return ids;
}

function extractSpotifyPaths(text: string): string[] {
  const paths: string[] = [];
  const pattern = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:embed\/)?(track|album|playlist|artist)\/([a-zA-Z0-9]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const path = `${match[1]}/${match[2]}`;
    if (!paths.includes(path)) paths.push(path);
  }
  return paths;
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="max-w-4xl">
      <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function SpotifyEmbed({ embedPath }: { embedPath: string }) {
  return (
    <div className="max-w-xl">
      <iframe
        src={`https://open.spotify.com/embed/${embedPath}`}
        width="100%"
        height="152"
        allow="encrypted-media"
        className="rounded-xl"
        title="Spotify player"
      />
    </div>
  );
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

  const contentText = lesson.content || '';
  const videoUrl = lesson.video_url || '';

  const contentYoutubeIds = useMemo(() => extractYouTubeIds(contentText), [contentText]);
  const contentSpotifyPaths = useMemo(() => extractSpotifyPaths(contentText), [contentText]);

  const spotifyPathFromVideoUrl = useMemo(() => {
    const m = videoUrl.match(/spotify\.com\/(?:embed\/)?(track|album|playlist|artist)\/([a-zA-Z0-9]+)/i);
    return m ? `${m[1]}/${m[2]}` : null;
  }, [videoUrl]);

  const youtubeIdsToRender = useMemo(() => {
    // If main player is already YouTube, don't double-render from content
    if (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) return [];
    return contentYoutubeIds;
  }, [contentYoutubeIds, videoUrl]);

  const spotifyPathsToRender = useMemo(() => {
    const all = new Set<string>();
    if (spotifyPathFromVideoUrl) all.add(spotifyPathFromVideoUrl);
    contentSpotifyPaths.forEach((p) => all.add(p));
    return Array.from(all);
  }, [contentSpotifyPaths, spotifyPathFromVideoUrl]);

  return (
    <div className="flex-1 overflow-auto w-full">
      <div className="w-full max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
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

        {/* Soundslice Embed - if video_url contains soundslice or is a short ID */}
        {lesson.video_url && (lesson.video_url.includes('soundslice') || (!lesson.video_url.includes('youtube') && !lesson.video_url.includes('vimeo') && !lesson.video_url.includes('.mp4') && !lesson.video_url.includes('spotify.com'))) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SoundsliceEmbed 
              sliceIdOrUrl={lesson.video_url}
              preset="guitar"
              height={600}
            />
          </motion.div>
        )}

        {/* Video Player - only for YouTube/Vimeo/direct video URLs */}
        {lesson.video_url && (lesson.video_url.includes('youtube') || lesson.video_url.includes('vimeo') || lesson.video_url.includes('.mp4')) && (
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
                  title="YouTube video"
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

        {/* Extra embeds found in lesson content (YouTube/Spotify) */}
        {(youtubeIdsToRender.length > 0 || spotifyPathsToRender.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 space-y-4"
          >
            {youtubeIdsToRender.map((id) => (
              <YouTubeEmbed key={id} videoId={id} />
            ))}
            {spotifyPathsToRender.map((p) => (
              <SpotifyEmbed key={p} embedPath={p} />
            ))}
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
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                {lesson.content
                  .split('\n')
                  .filter((p) =>
                    !p.includes('[guitar') &&
                    !p.includes('[drum') &&
                    !p.includes('[bass') &&
                    !p.includes('[vocals') &&
                    !p.includes('soundslice.com'),
                  )
                  .map((paragraph, i) => {
                    const cleaned = paragraph
                      .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[\S]+/gi, '')
                      .replace(/(?:https?:\/\/)?(?:open\.)?spotify\.com\/[\S]+/gi, '')
                      .trim();
                    if (!cleaned) return null;
                    return <p key={i}>{cleaned}</p>;
                  })}
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

