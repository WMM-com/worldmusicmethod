import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { useMyRatingForBooking, useCreateLessonRating } from '@/hooks/useLessonRatings';
import { toast } from 'sonner';

interface LessonRatingFormProps {
  bookingRequestId: string;
  tutorId: string;
  lessonId: string;
}

export function LessonRatingForm({ bookingRequestId, tutorId, lessonId }: LessonRatingFormProps) {
  const { data: existingRating, isLoading } = useMyRatingForBooking(bookingRequestId);
  const createRating = useCreateLessonRating();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');

  if (isLoading) return null;

  if (existingRating) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">Your rating:</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < existingRating.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
        {existingRating.review && (
          <span className="text-xs text-muted-foreground ml-2 truncate max-w-[150px]">
            "{existingRating.review}"
          </span>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Please select a rating'); return; }
    try {
      await createRating.mutateAsync({ bookingRequestId, tutorId, lessonId, rating, review: review.trim() || undefined });
      toast.success('Rating submitted!');
    } catch {
      toast.error('Failed to submit rating');
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Rate this lesson</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoveredRating(i + 1)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(i + 1)}
              className="p-0.5"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  i < (hoveredRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
          {rating > 0 && <span className="text-sm ml-1 text-muted-foreground">{rating}/5</span>}
        </div>
        <Textarea
          placeholder="Leave a review (optional)"
          value={review}
          onChange={e => setReview(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={createRating.isPending}>
          {createRating.isPending ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </CardContent>
    </Card>
  );
}
