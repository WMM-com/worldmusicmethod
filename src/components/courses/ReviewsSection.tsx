import { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useCourseReviews, useCourseAverageRating, useCourseReviewsCount } from '@/hooks/useReviews';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ReviewsSectionProps {
  courseId: string;
  courseTitle?: string;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            rating >= star
              ? 'fill-secondary text-secondary'
              : rating >= star - 0.5
              ? 'fill-secondary/50 text-secondary'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return 'Anonymous';
  return fullName.split(' ')[0];
}

function getInitials(fullName: string | null): string {
  if (!fullName) return '?';
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

export function ReviewsSection({ courseId, courseTitle }: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 10;

  const { data: avgRating, isLoading: avgLoading } = useCourseAverageRating(courseId);
  const { data: totalCount } = useCourseReviewsCount(courseId);
  const { data: reviews, isLoading: reviewsLoading } = useCourseReviews(
    courseId,
    showAll ? undefined : INITIAL_LIMIT
  );

  const isLoading = avgLoading || reviewsLoading;

  if (isLoading) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Student Reviews</h2>
        <div className="flex items-center gap-6">
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </section>
    );
  }

  // Hide entire section when no reviews
  if (!reviews || reviews.length === 0) {
    return null;
  }

  const hasMore = (totalCount ?? 0) > INITIAL_LIMIT && !showAll;

  return (
    <section className="py-20 bg-muted/30 border-t border-border/30">
      <div className="max-w-6xl mx-auto px-6 space-y-6">
      <h2 className="text-2xl font-bold">Student Reviews</h2>

      {/* Average Rating Summary */}
      {avgRating && (
        <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-4xl font-bold">{avgRating.average.toFixed(1)}</div>
            <StarDisplay rating={avgRating.average} size="md" />
          </div>
          <div className="text-muted-foreground">
            Based on <span className="font-semibold text-foreground">{avgRating.count}</span> review
            {avgRating.count !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className={cn(
        reviews.length > 2
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
          : 'space-y-4'
      )}>
        {reviews.map((review) => (
          <Card key={review.id} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex gap-4">
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(review.profiles?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {getFirstName(review.profiles?.full_name ?? null)}
                      </span>
                      <StarDisplay rating={review.rating} size="sm" />
                    </div>
                    <time className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </time>
                  </div>

                  {/* Prompt Q&A */}
                  {review.prompt_question && review.prompt_answer && (
                    <div className="space-y-1">
                      <p className="text-sm italic text-muted-foreground">
                        "{review.prompt_question}"
                      </p>
                      <p className="text-sm">{review.prompt_answer}</p>
                    </div>
                  )}

                  {/* General Review Text */}
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground pt-1 border-t border-border/50">
                      {review.review_text}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Show More */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAll(true)}>
            Show All {totalCount} Reviews
          </Button>
        </div>
      )}
      </div>
    </section>
  );
}
