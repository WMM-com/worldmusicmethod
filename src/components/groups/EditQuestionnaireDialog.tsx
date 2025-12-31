import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Plus, X, Pin, PinOff } from 'lucide-react';
import { useUpdateQuestionnaire, type Question, type QuestionType, type Questionnaire } from '@/hooks/useQuestionnaires';

interface EditQuestionnaireDialogProps {
  questionnaire: Questionnaire;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes (multiple answers)' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'text', label: 'Free Text' },
];

export function EditQuestionnaireDialog({ questionnaire, open, onOpenChange }: EditQuestionnaireDialogProps) {
  const [title, setTitle] = useState(questionnaire.title);
  const [description, setDescription] = useState(questionnaire.description || '');
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(questionnaire.allow_multiple_responses);
  const [isActive, setIsActive] = useState(questionnaire.is_active);
  const [isPinned, setIsPinned] = useState(questionnaire.is_pinned || false);
  const [questions, setQuestions] = useState<Question[]>(questionnaire.questions);
  
  const updateQuestionnaire = useUpdateQuestionnaire();
  
  useEffect(() => {
    setTitle(questionnaire.title);
    setDescription(questionnaire.description || '');
    setAllowMultipleResponses(questionnaire.allow_multiple_responses);
    setIsActive(questionnaire.is_active);
    setIsPinned(questionnaire.is_pinned || false);
    setQuestions(questionnaire.questions);
  }, [questionnaire]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validQuestions = questions.filter(q => {
      if (!q.question.trim()) return false;
      if ((q.type === 'multiple_choice' || q.type === 'checkbox') && 
          (!q.options || q.options.filter(o => o.trim()).length < 2)) return false;
      return true;
    });
    
    if (validQuestions.length === 0) return;
    
    await updateQuestionnaire.mutateAsync({
      questionnaireId: questionnaire.id,
      groupId: questionnaire.group_id,
      updates: {
        title,
        description: description || null,
        questions: validQuestions.map(q => ({
          ...q,
          options: q.options?.filter(o => o.trim()),
        })),
        allow_multiple_responses: allowMultipleResponses,
        is_active: isActive,
        is_pinned: isPinned,
      },
    });
    
    onOpenChange(false);
  };
  
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: crypto.randomUUID(), type: 'multiple_choice', question: '', options: ['', ''], required: true },
    ]);
  };
  
  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };
  
  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };
  
  const addOption = (questionIndex: number) => {
    const q = questions[questionIndex];
    if ((q.options?.length || 0) < 10) {
      updateQuestion(questionIndex, { options: [...(q.options || []), ''] });
    }
  };
  
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = questions[questionIndex];
    if ((q.options?.length || 0) > 2) {
      updateQuestion(questionIndex, { 
        options: q.options?.filter((_, i) => i !== optionIndex) 
      });
    }
  };
  
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const q = questions[questionIndex];
    const newOptions = [...(q.options || [])];
    newOptions[optionIndex] = value;
    updateQuestion(questionIndex, { options: newOptions });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Edit Survey
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Course Feedback Survey"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this survey is about..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="multipleResponses">Allow multiple responses per user</Label>
              <Switch
                id="multipleResponses"
                checked={allowMultipleResponses}
                onCheckedChange={setAllowMultipleResponses}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Survey is active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="isPinned">Pin to top of feed</Label>
              </div>
              <Switch
                id="isPinned"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>
          </div>
          
          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
            
            {questions.map((q, qIndex) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                        placeholder={`Question ${qIndex + 1}`}
                        className="flex-1"
                      />
                      <Select
                        value={q.type}
                        onValueChange={(v) => updateQuestion(qIndex, { 
                          type: v as QuestionType,
                          options: (v === 'multiple_choice' || v === 'checkbox') ? (q.options || ['', '']) : undefined,
                        })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                      <div className="space-y-2 pl-4">
                        {q.options?.map((option, oIndex) => (
                          <div key={oIndex} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1"
                            />
                            {(q.options?.length || 0) > 2 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {(q.options?.length || 0) < 10 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => addOption(qIndex)}
                            className="text-muted-foreground"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {q.type === 'rating' && (
                      <div className="flex gap-4 pl-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Min:</Label>
                          <Input
                            type="number"
                            value={q.min ?? 1}
                            onChange={(e) => updateQuestion(qIndex, { min: parseInt(e.target.value) || 1 })}
                            className="w-16"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Max:</Label>
                          <Input
                            type="number"
                            value={q.max ?? 5}
                            onChange={(e) => updateQuestion(qIndex, { max: parseInt(e.target.value) || 5 })}
                            className="w-16"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pl-4">
                      <Switch
                        id={`required-${q.id}`}
                        checked={q.required}
                        onCheckedChange={(checked) => updateQuestion(qIndex, { required: checked })}
                      />
                      <Label htmlFor={`required-${q.id}`} className="text-sm text-muted-foreground">Required</Label>
                    </div>
                  </div>
                  
                  {questions.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title || questions.every(q => !q.question.trim()) || updateQuestionnaire.isPending}
            >
              {updateQuestionnaire.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
