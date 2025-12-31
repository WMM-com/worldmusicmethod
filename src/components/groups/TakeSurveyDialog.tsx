import { useState } from 'react';
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
import type { Questionnaire, Question } from '@/hooks/useQuestionnaires';

interface TakeSurveyDialogProps {
  questionnaire: Questionnaire;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TakeSurveyDialog({ questionnaire, open, onOpenChange }: TakeSurveyDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const submitResponse = useSubmitQuestionnaireResponse();

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
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string) => {
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
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{questionnaire.title}</DialogTitle>
          {questionnaire.description && (
            <p className="text-sm text-muted-foreground">{questionnaire.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questionnaire.questions.map((q, i) => renderQuestion(q, i))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || submitResponse.isPending}
          >
            {submitResponse.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
