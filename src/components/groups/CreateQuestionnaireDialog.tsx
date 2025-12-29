import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { ClipboardList, Plus, X, GripVertical } from 'lucide-react';
import { useCreateQuestionnaire, type Question, type QuestionType } from '@/hooks/useQuestionnaires';

interface CreateQuestionnaireDialogProps {
  groupId: string;
  channelId?: string | null;
  trigger?: React.ReactNode;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes (multiple answers)' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'text', label: 'Free Text' },
];

export function CreateQuestionnaireDialog({ groupId, channelId, trigger }: CreateQuestionnaireDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), type: 'multiple_choice', question: '', options: ['', ''], required: true },
  ]);
  
  const createQuestionnaire = useCreateQuestionnaire();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validQuestions = questions.filter(q => {
      if (!q.question.trim()) return false;
      if ((q.type === 'multiple_choice' || q.type === 'checkbox') && 
          (!q.options || q.options.filter(o => o.trim()).length < 2)) return false;
      return true;
    });
    
    if (validQuestions.length === 0) return;
    
    await createQuestionnaire.mutateAsync({
      group_id: groupId,
      channel_id: channelId || undefined,
      title,
      description: description || undefined,
      questions: validQuestions.map(q => ({
        ...q,
        options: q.options?.filter(o => o.trim()),
      })),
      allow_multiple_responses: allowMultipleResponses,
    });
    
    setOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAllowMultipleResponses(false);
    setQuestions([
      { id: crypto.randomUUID(), type: 'multiple_choice', question: '', options: ['', ''], required: true },
    ]);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            Create Survey
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Feedback Survey
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
                    
                    {/* Options for multiple choice / checkbox */}
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
                    
                    {/* Rating scale options */}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title || questions.every(q => !q.question.trim()) || createQuestionnaire.isPending}
            >
              {createQuestionnaire.isPending ? 'Creating...' : 'Create Survey'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}