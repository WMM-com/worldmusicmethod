import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lesson } from '@/hooks/useLessons';

interface LessonCardProps {
  lesson: Lesson;
  index?: number;
}

export function LessonCard({ lesson, index = 0 }: LessonCardProps) {
  const navigate = useNavigate();
  const tutor = lesson.tutor;

  const formatPrice = () => {
    if (!lesson.price || lesson.price === 0) return 'Free';
    const symbol = lesson.currency === 'GBP' ? '£' : lesson.currency === 'EUR' ? '€' : '$';
    return `${symbol}${lesson.price}`;
  };

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
          <Badge className="absolute top-3 right-3 text-sm font-semibold">
            {formatPrice()}
          </Badge>
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
                <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                  {tutor.full_name || 'Tutor'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{lesson.duration_minutes} min</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
