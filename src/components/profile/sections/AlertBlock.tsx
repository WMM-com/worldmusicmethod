import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pencil, Check, X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

const ALERT_VARIANTS = {
  info: { icon: Info, className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  warning: { icon: AlertTriangle, className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' },
  error: { icon: AlertCircle, className: 'border-destructive/50 bg-destructive/10 text-destructive' },
  success: { icon: CheckCircle, className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300' }
};

export function AlertBlock({ section, isEditing, onUpdate }: AlertBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const variant = content.variant || 'info';
  const title = content.title || 'Notice';
  const description = content.description || 'This is an important message for your visitors.';

  const [editState, setEditState] = useState({
    variant,
    title,
    description
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const currentVariant = ALERT_VARIANTS[variant as keyof typeof ALERT_VARIANTS] || ALERT_VARIANTS.info;
  const Icon = currentVariant.icon;

  if (inlineEdit && isEditing) {
    const previewVariant = ALERT_VARIANTS[editState.variant as keyof typeof ALERT_VARIANTS] || ALERT_VARIANTS.info;
    const PreviewIcon = previewVariant.icon;

    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Alert</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div>
            <Label>Alert Type</Label>
            <Select value={editState.variant} onValueChange={(v) => setEditState(s => ({ ...s, variant: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" /> Info
                  </div>
                </SelectItem>
                <SelectItem value="warning">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" /> Warning
                  </div>
                </SelectItem>
                <SelectItem value="error">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" /> Error
                  </div>
                </SelectItem>
                <SelectItem value="success">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Success
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={editState.title}
              onChange={(e) => setEditState(s => ({ ...s, title: e.target.value }))}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={editState.description}
              onChange={(e) => setEditState(s => ({ ...s, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <Alert className={cn("mt-2", previewVariant.className)}>
              <PreviewIcon className="h-4 w-4" />
              <AlertTitle>{editState.title}</AlertTitle>
              <AlertDescription>{editState.description}</AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group relative py-4">
      {isEditing && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute -top-2 -right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={() => setInlineEdit(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Alert className={currentVariant.className}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}
