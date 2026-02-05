import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Check, X, Code, AlertTriangle } from 'lucide-react';
import DOMPurify from 'dompurify';

interface HtmlBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function HtmlBlock({ section, isEditing, onUpdate }: HtmlBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const html = content.html || '<p>Your custom HTML here...</p>';

  const [editState, setEditState] = useState({
    html: html
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  // Sanitize HTML for safe rendering
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target']
  });

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium flex items-center gap-2">
              <Code className="h-4 w-4" />
              Edit HTML
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              HTML is sanitized for security. Some tags and attributes may be removed.
            </p>
          </div>

          <div>
            <Label>HTML Code</Label>
            <Textarea
              value={editState.html}
              onChange={(e) => setEditState(s => ({ ...s, html: e.target.value }))}
              rows={10}
              className="font-mono text-sm"
              placeholder="<div>Your HTML here...</div>"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div 
              className="p-4 border rounded-lg bg-muted/50 min-h-[100px]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editState.html, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target']
              }) }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group relative">
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
      <div 
        className="py-4"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
