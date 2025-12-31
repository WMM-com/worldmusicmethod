import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Plus, X } from 'lucide-react';
import { useCreateGroupPoll } from '@/hooks/useGroups';

interface CreatePollDialogProps {
  groupId: string;
  channelId?: string | null;
  trigger?: React.ReactNode;
}

export function CreatePollDialog({ groupId, channelId, trigger }: CreatePollDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const createPoll = useCreateGroupPoll();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) return;
    
    const endsAt = hasEndDate && endDate && endTime 
      ? new Date(`${endDate}T${endTime}`).toISOString() 
      : undefined;
    
    await createPoll.mutateAsync({
      group_id: groupId,
      channel_id: channelId,
      question,
      options: validOptions,
      is_multiple_choice: isMultipleChoice,
      ends_at: endsAt,
    });
    
    setOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    setHasEndDate(false);
    setEndDate('');
    setEndTime('');
  };
  
  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };
  
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };
  
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const validOptions = options.filter(o => o.trim()).length;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Create Poll
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Options (min 2, max 10)</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="multipleChoice">Allow multiple selections</Label>
            <Switch
              id="multipleChoice"
              checked={isMultipleChoice}
              onCheckedChange={setIsMultipleChoice}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="hasEndDate">Set end date</Label>
              <Switch
                id="hasEndDate"
                checked={hasEndDate}
                onCheckedChange={setHasEndDate}
              />
            </div>
            
            {hasEndDate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!question || validOptions < 2 || createPoll.isPending}>
              {createPoll.isPending ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
