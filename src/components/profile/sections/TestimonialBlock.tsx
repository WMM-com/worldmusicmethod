import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, Plus, Trash2, Quote, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  rating?: number;
  image?: string;
}

interface TestimonialBlockProps {
  section: {
    id: string;
    content: any;
  };
  isEditing: boolean;
  onUpdate: (content: any) => void;
}

export function TestimonialBlock({ section, isEditing, onUpdate }: TestimonialBlockProps) {
  const [inlineEdit, setInlineEdit] = useState(false);
  const content = section.content || {};
  
  const testimonials: Testimonial[] = content.testimonials || [
    { quote: 'Amazing artist! The performance was incredible.', author: 'John Doe', role: 'Event Organizer', rating: 5 },
    { quote: 'Highly professional and talented. Would book again!', author: 'Jane Smith', role: 'Music Director', rating: 5 }
  ];
  const layout = content.layout || 'cards';
  const showRating = content.showRating !== false;

  const [editState, setEditState] = useState({
    testimonials,
    layout,
    showRating
  });

  const handleSave = () => {
    onUpdate(editState);
    setInlineEdit(false);
  };

  const updateTestimonial = (index: number, field: keyof Testimonial, value: any) => {
    const updated = [...editState.testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setEditState(s => ({ ...s, testimonials: updated }));
  };

  const addTestimonial = () => {
    setEditState(s => ({
      ...s,
      testimonials: [...s.testimonials, { quote: 'New testimonial...', author: 'Name', rating: 5 }]
    }));
  };

  const removeTestimonial = (index: number) => {
    setEditState(s => ({
      ...s,
      testimonials: s.testimonials.filter((_, i) => i !== index)
    }));
  };

  if (inlineEdit && isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Edit Testimonials</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInlineEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Layout</Label>
              <Select value={editState.layout} onValueChange={(v) => setEditState(s => ({ ...s, layout: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cards">Cards</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showRating"
                  checked={editState.showRating}
                  onChange={(e) => setEditState(s => ({ ...s, showRating: e.target.checked }))}
                />
                <Label htmlFor="showRating">Show star rating</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {editState.testimonials.map((t, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Testimonial {index + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeTestimonial(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Quote</Label>
                  <Textarea
                    value={t.quote}
                    onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Author</Label>
                    <Input
                      value={t.author}
                      onChange={(e) => updateTestimonial(index, 'author', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Role (optional)</Label>
                    <Input
                      value={t.role || ''}
                      onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Rating (1-5)</Label>
                    <Input
                      type="number"
                      value={t.rating || 5}
                      onChange={(e) => updateTestimonial(index, 'rating', Math.min(5, Math.max(1, parseInt(e.target.value) || 5)))}
                      min={1}
                      max={5}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Image URL (optional)</Label>
                    <Input
                      value={t.image || ''}
                      onChange={(e) => updateTestimonial(index, 'image', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addTestimonial}>
            <Plus className="h-4 w-4 mr-2" /> Add Testimonial
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
          )}
        />
      ))}
    </div>
  );

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
      
      {layout === 'cards' && (
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((t, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Quote className="h-6 w-6 text-primary/30 mb-2" />
                <p className="italic text-muted-foreground mb-3">{t.quote}</p>
                {showRating && t.rating && renderStars(t.rating)}
                <div className="mt-3 flex items-center gap-3">
                  {t.image && (
                    <img src={t.image} alt={t.author} className="h-10 w-10 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{t.author}</p>
                    {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {layout === 'list' && (
        <div className="space-y-4">
          {testimonials.map((t, index) => (
            <div key={index} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              {t.image && (
                <img src={t.image} alt={t.author} className="h-12 w-12 rounded-full object-cover shrink-0" />
              )}
              <div>
                <p className="italic text-muted-foreground mb-2">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  {showRating && t.rating && renderStars(t.rating)}
                  <span className="font-medium text-sm">{t.author}</span>
                  {t.role && <span className="text-xs text-muted-foreground">• {t.role}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {layout === 'minimal' && (
        <div className="space-y-6 text-center">
          {testimonials.map((t, index) => (
            <div key={index}>
              <Quote className="h-8 w-8 text-primary/20 mx-auto mb-2" />
              <p className="text-lg italic text-muted-foreground mb-2">"{t.quote}"</p>
              {showRating && t.rating && <div className="flex justify-center mb-2">{renderStars(t.rating)}</div>}
              <p className="font-medium">{t.author}</p>
              {t.role && <p className="text-sm text-muted-foreground">{t.role}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
