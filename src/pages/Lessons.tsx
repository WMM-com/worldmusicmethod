import { useLessons } from '@/hooks/useLessons';
import { LessonCard } from '@/components/lessons/LessonCard';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';

export default function Lessons() {
  const { data: lessons, isLoading } = useLessons();

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              Private Lessons
            </h1>
            <p className="text-muted-foreground mt-1">
              Book one-on-one lessons with expert tutors
            </p>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : lessons?.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson, i) => (
                <LessonCard key={lesson.id} lesson={lesson} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No lessons available yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
