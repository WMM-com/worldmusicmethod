import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Users, Repeat, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lesson } from '@/hooks/useLessons';
import { useTutorAverageRating } from '@/hooks/useLessonRatings';

interface LessonCardProps {
  lesson: Lesson;
  index?: number;
}

export function LessonCard({ lesson, index = 0 }: LessonCardProps) {
  const navigate = useNavigate();
  const tutor = lesson.tutor;
  const { data: ratingData } = useTutorAverageRating(lesson.tutor_id);

  const formatPrice = () => {
    if (!lesson.price || lesson.price === 0) return 'Free';
    const symbol = lesson.currency === 'GBP' ? '£' : lesson.currency === 'EUR' ? '€' : '$';
    return `${symbol}${lesson.price}`;
  };

  const lessonType = lesson.lesson_type || 'single';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card
        className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300"
        onClick={() => navigate(`/lessons/${lesson.id}`)}
      >
        {/* Lesson Image */}
        <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          {lesson.image_url ? (
            <img
              src={lesson.image_url}
              alt={lesson.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Clock className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <Badge className="text-sm font-semibold">{formatPrice()}</Badge>
            {lessonType === 'recurring' && (
              <Badge variant="secondary" className="text-xs gap-0.5">
                <Repeat className="h-3 w-3" /> Series
              </Badge>
            )}
            {lessonType === 'group' && (
              <Badge variant="secondary" className="text-xs gap-0.5">
                <Users className="h-3 w-3" /> Group
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {lesson.title}
          </h3>

          {lesson.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {lesson.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            {/* Tutor info */}
            {tutor && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={tutor.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {tutor.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                    {tutor.full_name || 'Tutor'}
                  </span>
                  {ratingData && ratingData.count > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {ratingData.average}
                      <span className="text-muted-foreground">({ratingData.count})</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{lesson.duration_minutes} min</span>
            </div>
          </div>

          {/* Recurring info */}
          {lessonType === 'recurring' && lesson.recurring_config && (
            <div className="mt-2 text-xs text-muted-foreground">
              {lesson.recurring_config.total_sessions} sessions · {lesson.recurring_config.frequency}
              {lesson.recurring_config.series_price != null && (
                <> · Series price: {lesson.currency === 'GBP' ? '£' : lesson.currency === 'EUR' ? '€' : '$'}{lesson.recurring_config.series_price}</>
              )}
            </div>
          )}

          {/* Group info */}
          {lessonType === 'group' && lesson.max_students > 1 && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Up to {lesson.max_students} students
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
