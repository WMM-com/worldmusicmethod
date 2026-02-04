import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateReview, useUserReview, useUserEnrollment } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';

interface WriteReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

interface FormData {
  promptAnswer: string;
  reviewText: string;
}

const PROMPT_OPTIONS = [
  "What was the best thing about this course?",
  "What surprised you the most?",
  "How has this course changed how you think about music?",
] as const;

function StarRating({ 
  rating, 
  onRatingChange,
  size = 'md'
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none transition-transform hover:scale-110"
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onRatingChange(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors',
              (hoverRating || rating) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function WriteReviewModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  
  const { data: existingReview } = useUserReview(courseId);
  const { data: enrollment } = useUserEnrollment(courseId);
  const createReview = useCreateReview();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      promptAnswer: '',
      reviewText: '',
    },
  });

  const promptAnswerValue = watch('promptAnswer');
  const reviewTextValue = watch('reviewText');

  const hasAccess = !!enrollment?.is_active;
  const hasExistingReview = !!existingReview;

  // Validation: prompt required for ≤4 stars, review text required for 5 stars
  const isPromptRequired = rating >= 1 && rating <= 4;
  const isReviewTextRequired = rating === 5;

  const onSubmit = async (data: FormData) => {
    if (rating === 0) {
      return;
    }

    // Validate based on rating
    if (isPromptRequired && (!selectedPrompt || !data.promptAnswer?.trim())) {
      return;
    }
    if (isReviewTextRequired && !data.reviewText?.trim()) {
      return;
    }

    await createReview.mutateAsync({
      course_id: courseId,
      rating,
      review_text: data.reviewText || undefined,
      prompt_question: selectedPrompt || undefined,
      prompt_answer: data.promptAnswer || undefined,
    });

    // Reset form and close modal
    reset();
    setRating(0);
    setSelectedPrompt('');
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setRating(0);
    setSelectedPrompt('');
    onOpenChange(false);
  };

  // Don't render if user doesn't have access or already reviewed
  if (!hasAccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access Required</DialogTitle>
            <DialogDescription>
              You need to be enrolled in this course to leave a review.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (hasExistingReview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already Reviewed</DialogTitle>
            <DialogDescription>
              You have already submitted a review for this course. Thank you for your feedback!
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-5 h-5',
                    existingReview.rating >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with "{courseTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Your Rating <span className="text-destructive">*</span>
            </Label>
            <StarRating rating={rating} onRatingChange={setRating} />
            {rating === 0 && (
              <p className="text-sm text-muted-foreground">
                Click a star to rate
              </p>
            )}
          </div>

          {/* Prompt Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-base font-medium">
              Answer a Question {isPromptRequired && <span className="text-destructive">*</span>}
            </Label>
            <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
              <SelectTrigger id="prompt" className={isPromptRequired && !selectedPrompt ? 'border-destructive' : ''}>
                <SelectValue placeholder="Choose a question to answer..." />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_OPTIONS.map((prompt) => (
                  <SelectItem key={prompt} value={prompt}>
                    {prompt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPromptRequired && !selectedPrompt && (
              <p className="text-sm text-destructive">Please select a question to answer</p>
            )}
          </div>

          {/* Prompt Answer */}
          {selectedPrompt && (
            <div className="space-y-2">
              <Label htmlFor="promptAnswer" className="text-sm font-medium text-muted-foreground">
                {selectedPrompt} {isPromptRequired && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="promptAnswer"
                placeholder="Share your thoughts..."
                className={cn("min-h-[100px] resize-none", isPromptRequired && !promptAnswerValue?.trim() ? 'border-destructive' : '')}
                {...register('promptAnswer')}
              />
              {isPromptRequired && !promptAnswerValue?.trim() && (
                <p className="text-sm text-destructive">Please provide an answer</p>
              )}
            </div>
          )}

          {/* General Review Text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText" className="text-base font-medium">
              Additional Comments {isReviewTextRequired ? <span className="text-destructive">*</span> : '(optional)'}
            </Label>
            <Textarea
              id="reviewText"
              placeholder="Any other thoughts about the course..."
              className={cn("min-h-[80px] resize-none", isReviewTextRequired && !reviewTextValue?.trim() ? 'border-destructive' : '')}
              {...register('reviewText')}
            />
            {isReviewTextRequired && !reviewTextValue?.trim() && (
              <p className="text-sm text-destructive">Please share your thoughts for a 5-star review</p>
            )}
          </div>

          {/* Gamification hint */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Write reviews for your first 5 courses to earn 50 bonus points each!
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                rating === 0 || 
                createReview.isPending ||
                (isPromptRequired && (!selectedPrompt || !promptAnswerValue?.trim())) ||
                (isReviewTextRequired && !reviewTextValue?.trim())
              }
            >
              {createReview.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
