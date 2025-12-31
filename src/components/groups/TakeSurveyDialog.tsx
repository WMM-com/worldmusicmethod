import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useSubmitQuestionnaireResponse } from '@/hooks/useQuestionnaires';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Questionnaire, Question } from '@/hooks/useQuestionnaires';

interface TakeSurveyDialogProps {
  questionnaire: Questionnaire;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TakeSurveyDialog({ questionnaire, open, onOpenChange }: TakeSurveyDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitResponse = useSubmitQuestionnaireResponse();
  const { user } = useAuth();

  // Load user's previous response if they've already responded
  useEffect(() => {
    if (!open || !user || !questionnaire.user_has_responded) {
      setAnswers({});
      setIsViewOnly(false);
      return;
    }

    const loadPreviousResponse = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('questionnaire_responses')
          .select('answers')
          .eq('questionnaire_id', questionnaire.id)
          .eq('user_id', user.id)
          .single();

        if (data?.answers) {
          setAnswers(data.answers as Record<string, string | string[] | number>);
          setIsViewOnly(!questionnaire.allow_multiple_responses);
        }
      } catch (error) {
        console.error('Error loading response:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreviousResponse();
  }, [open, user, questionnaire.id, questionnaire.user_has_responded, questionnaire.allow_multiple_responses]);

  const handleSubmit = () => {
    submitResponse.mutate(
      { questionnaireId: questionnaire.id, answers },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAnswers({});
        },
      }
    );
  };

  const updateAnswer = (questionId: string, value: string | string[] | number) => {
    if (isViewOnly) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string) => {
    if (isViewOnly) return;
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter(o => o !== option) };
      }
      return { ...prev, [questionId]: [...current, option] };
    });
  };

  const isFormValid = questionnaire.questions.every(q => {
    if (!q.required) return true;
    const answer = answers[q.id];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'string') return answer.trim().length > 0;
    return true;
  });

  const renderQuestion = (question: Question, index: number) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div key={question.id} className="space-y-3">
            <Label className="text-base">
              {index + 1}. {question.question}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={answers[question.id] as string || ''}
              onValueChange={(value) => updateAnswer(question.id, value)}
              disabled={isViewOnly}
            >
              {question.options?.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                  <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox':
        return (
          <div key={question.id} className="space-y-3">
            <Label className="text-base">
              {index + 1}. {question.question}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${i}`}
                    checked={((answers[question.id] as string[]) || []).includes(option)}
                    onCheckedChange={() => toggleCheckboxAnswer(question.id, option)}
                    disabled={isViewOnly}
                  />
                  <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rating':
        const min = question.min || 1;
        const max = question.max || 5;
        const currentValue = (answers[question.id] as number) || min;
        return (
          <div key={question.id} className="space-y-3">
            <Label className="text-base">
              {index + 1}. {question.question}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{min}</span>
              <Slider
                value={[currentValue]}
                min={min}
                max={max}
                step={1}
                onValueChange={([value]) => updateAnswer(question.id, value)}
                className="flex-1"
                disabled={isViewOnly}
              />
              <span className="text-sm text-muted-foreground">{max}</span>
              <span className="w-8 text-center font-medium">{currentValue}</span>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={question.id} className="space-y-3">
            <Label className="text-base">
              {index + 1}. {question.question}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              value={(answers[question.id] as string) || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              placeholder="Your answer..."
              rows={3}
              disabled={isViewOnly}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{questionnaire.title}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">Loading your response...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewOnly ? 'Your Response' : questionnaire.title}
          </DialogTitle>
          {questionnaire.description && (
            <p className="text-sm text-muted-foreground">{questionnaire.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questionnaire.questions.map((q, i) => renderQuestion(q, i))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isViewOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isViewOnly && (
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid || submitResponse.isPending}
            >
              {submitResponse.isPending ? 'Submitting...' : questionnaire.user_has_responded ? 'Update Response' : 'Submit'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
