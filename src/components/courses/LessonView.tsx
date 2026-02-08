import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  BookOpen, 
  Headphones, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMarkLessonComplete } from '@/hooks/useCourses';
import { useTestByLesson } from '@/hooks/useTests';
import { toast } from 'sonner';
import { SoundsliceEmbed, SoundslicePreset } from './SoundsliceEmbed';
import { TestPlayer } from './TestPlayer';
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
  const markComplete = useMarkLessonComplete();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Check if this lesson has a test
  const { data: lessonTest, isLoading: testLoading } = useTestByLesson(lesson.id);

  // Scroll to top when lesson changes
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [lesson.id]);

  const handleMarkComplete = async () => {
    try {
      await markComplete.mutateAsync({ 
        lessonId: lesson.id, 
        courseId 
      });
      
      toast.success('Lesson completed!');
      
      // Navigate to next lesson if available
      if (hasNext) {
        onNavigate('next');
      }
    } catch (error) {
      toast.error('Failed to save progress');
    }
  };

  const handleTestComplete = () => {
    // Mark lesson complete after test
    if (!isCompleted) {
      handleMarkComplete();
    }
  };

  const listeningRefs = lesson.listening_references || [];
  
  // Access additional fields from database
  const lessonData = lesson as any;
  const dbYoutubeUrls: string[] = lessonData.youtube_urls || [];
  const dbSpotifyUrls: string[] = lessonData.spotify_urls || [];
  const fileAttachments: { name: string; url: string; type: string }[] = lessonData.file_attachments || [];

  const contentText = lesson.content || '';
  const videoUrl = lesson.video_url || '';

  const contentYoutubeIds = useMemo(() => extractYouTubeIds(contentText), [contentText]);
  const contentSpotifyPaths = useMemo(() => extractSpotifyPaths(contentText), [contentText]);

  const spotifyPathFromVideoUrl = useMemo(() => {
    const m = videoUrl.match(/spotify\.com\/(?:embed\/)?(track|album|playlist|artist)\/([a-zA-Z0-9]+)/i);
    return m ? `${m[1]}/${m[2]}` : null;
  }, [videoUrl]);

  // Extract YouTube IDs from dedicated field
  const dbYoutubeIds = useMemo(() => dbYoutubeUrls.flatMap(url => extractYouTubeIds(url)), [dbYoutubeUrls]);
  
  // Extract Spotify paths from dedicated field
  const dbSpotifyPaths = useMemo(() => dbSpotifyUrls.flatMap(url => extractSpotifyPaths(url)), [dbSpotifyUrls]);

  const youtubeIdsToRender = useMemo(() => {
    // Combine db field and content parsed, but skip if main player is YouTube
    if (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) return dbYoutubeIds;
    const all = new Set([...dbYoutubeIds, ...contentYoutubeIds]);
    return Array.from(all);
  }, [contentYoutubeIds, dbYoutubeIds, videoUrl]);

  const spotifyPathsToRender = useMemo(() => {
    const all = new Set<string>();
    if (spotifyPathFromVideoUrl) all.add(spotifyPathFromVideoUrl);
    dbSpotifyPaths.forEach((p) => all.add(p));
    contentSpotifyPaths.forEach((p) => all.add(p));
    return Array.from(all);
  }, [contentSpotifyPaths, dbSpotifyPaths, spotifyPathFromVideoUrl]);

  return (
    <div ref={containerRef} className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-full">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 lg:py-8 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="capitalize">{lesson.lesson_type}</span>
            {lesson.duration_seconds && (
              <>
                <span>•</span>
                <span>{Math.floor(lesson.duration_seconds / 60)} min</span>
              </>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {lesson.title}
          </h1>

          {isCompleted && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </div>
          )}
        </motion.div>

        {/* Test Player - if lesson has an associated test */}
        {lessonTest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <TestPlayer test={lessonTest} onComplete={handleTestComplete} />
          </motion.div>
        )}

        {/* Soundslice Embed - if video_url contains soundslice or is a short ID */}
        {!lessonTest && lesson.video_url && (lesson.video_url.includes('soundslice') || (!lesson.video_url.includes('youtube') && !lesson.video_url.includes('vimeo') && !lesson.video_url.includes('.mp4') && !lesson.video_url.includes('spotify.com'))) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 sm:mb-8 w-full max-w-full overflow-hidden"
          >
            <SoundsliceEmbed 
              sliceIdOrUrl={lesson.video_url}
              preset={(lesson.soundslice_preset as SoundslicePreset) || 'guitar'}
              height={typeof window !== 'undefined' && window.innerWidth < 640 ? 400 : 600}
              className="w-full max-w-full"
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
            <Card className="p-6 bg-gray-50 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Lesson Notes</h2>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700">
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
                      .replace(/\*\*Spotify Playlist:\*\*/gi, '')
                      .replace(/\*\*YouTube Reference:\*\*/gi, '')
                      .replace(/\*\*YouTube:\*\*/gi, '')
                      .replace(/\*\*Spotify:\*\*/gi, '')
                      .replace(/---/g, '')
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
            <Card className="p-6 bg-gray-50 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Headphones className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Suggested Listening</h2>
              </div>
              <div className="space-y-3">
                {listeningRefs.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{ref.title}</p>
                      <p className="text-xs text-gray-500">{ref.artist}</p>
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

        {/* File Attachments - from dedicated field */}
        {fileAttachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gray-50 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Resources & Downloads</h2>
              </div>
              <div className="space-y-3">
                {fileAttachments.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500 uppercase">{file.type}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Lesson Navigation - clearly labeled */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-8"
        >
          <Button
            variant="ghost"
            onClick={() => onNavigate('prev')}
            disabled={!hasPrev}
            size="sm"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Previous Lesson</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          {!isCompleted && (
            <Button
              onClick={handleMarkComplete}
              disabled={markComplete.isPending}
              size="sm"
              className="flex-shrink-0"
            >
              Mark Complete
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => onNavigate('next')}
            disabled={!hasNext}
            size="sm"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">Next Lesson</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

