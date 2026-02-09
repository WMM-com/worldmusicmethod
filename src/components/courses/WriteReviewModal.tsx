import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Star, Pencil, Trash2, Clock } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useCreateReview, 
  useUpdateReview, 
  useDeleteReview, 
  useUserReview, 
  useUserEnrollment,
  isWithinEditWindow,
  getRemainingEditTime,
} from '@/hooks/useReviews';
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
                ? 'fill-secondary text-secondary'
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: existingReview, refetch: refetchReview } = useUserReview(courseId);
  const { data: enrollment } = useUserEnrollment(courseId);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
  const canEdit = hasExistingReview && isWithinEditWindow(existingReview.created_at);
  const editTimeRemaining = hasExistingReview ? getRemainingEditTime(existingReview.created_at) : '';

  // Populate form when entering edit mode
  useEffect(() => {
    if (isEditMode && existingReview) {
      setRating(existingReview.rating);
      setSelectedPrompt(existingReview.prompt_question || '');
      setValue('promptAnswer', existingReview.prompt_answer || '');
      setValue('reviewText', existingReview.review_text || '');
    }
  }, [isEditMode, existingReview, setValue]);

   // Validation: prompt answer always required, review text always optional
   const isPromptRequired = true;
   const isReviewTextRequired = false;

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

    if (isEditMode && existingReview) {
      await updateReview.mutateAsync({
        id: existingReview.id,
        rating,
        review_text: data.reviewText || undefined,
        prompt_question: selectedPrompt || undefined,
        prompt_answer: data.promptAnswer || undefined,
      });
      setIsEditMode(false);
    } else {
      await createReview.mutateAsync({
        course_id: courseId,
        rating,
        review_text: data.reviewText || undefined,
        prompt_question: selectedPrompt || undefined,
        prompt_answer: data.promptAnswer || undefined,
        courseName: courseTitle,
      });
    }

    // Reset form and close modal
    reset();
    setRating(0);
    setSelectedPrompt('');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    
    await deleteReview.mutateAsync({ 
      id: existingReview.id, 
      courseId 
    });
    
    setShowDeleteConfirm(false);
    reset();
    setRating(0);
    setSelectedPrompt('');
    setIsEditMode(false);
    // Refetch to clear existing review state
    refetchReview();
  };

  const handleClose = () => {
    reset();
    setRating(0);
    setSelectedPrompt('');
    setIsEditMode(false);
    onOpenChange(false);
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    reset();
    setRating(0);
    setSelectedPrompt('');
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

  if (hasExistingReview && !isEditMode) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Your Review</DialogTitle>
              <DialogDescription>
                You've already reviewed "{courseTitle}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Edit time remaining indicator */}
              {canEdit && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4" />
                  <span>{editTimeRemaining}</span>
                </div>
              )}

              {/* Rating Display */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Your rating:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-5 h-5',
                        existingReview.rating >= star
                          ? 'fill-secondary text-secondary'
                          : 'text-muted-foreground'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Prompt Q&A */}
              {existingReview.prompt_question && existingReview.prompt_answer && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm italic text-muted-foreground">
                    "{existingReview.prompt_question}"
                  </p>
                  <p className="text-sm">{existingReview.prompt_answer}</p>
                </div>
              )}

              {/* Review Text */}
              {existingReview.review_text && (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-muted-foreground">Additional comments:</span>
                  <p className="text-sm">{existingReview.review_text}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              {canEdit ? (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleStartEdit}
                    className="gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Edit period has expired
                </div>
              )}
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your review?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. You'll be able to submit a new review for this course after deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteReview.isPending}
              >
                {deleteReview.isPending ? 'Deleting...' : 'Delete Review'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Show form for new review OR edit mode
  const isSubmitting = createReview.isPending || updateReview.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Update your review for "${courseTitle}"` 
              : `Share your experience with "${courseTitle}"`
            }
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

          {/* Gamification hint - only show for new reviews */}
          {!isEditMode && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Write reviews for your first 5 courses to earn 50 bonus points each!
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={isEditMode ? handleCancelEdit : handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                rating === 0 || 
                isSubmitting ||
                (isPromptRequired && (!selectedPrompt || !promptAnswerValue?.trim())) ||
                (isReviewTextRequired && !reviewTextValue?.trim())
              }
            >
              {isSubmitting 
                ? (isEditMode ? 'Saving...' : 'Submitting...') 
                : (isEditMode ? 'Save Changes' : 'Submit Review')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
