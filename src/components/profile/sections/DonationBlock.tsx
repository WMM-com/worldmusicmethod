import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { 
  Heart, EllipsisVertical, Trash2, DollarSign, Coffee, Gift
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DonationBlockProps {
  section: ProfileSection;
  isEditing: boolean;
  userId: string;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

const PRESET_AMOUNTS = [5, 10, 25, 50];

const ICONS = {
  heart: Heart,
  coffee: Coffee,
  gift: Gift,
};

export function DonationBlock({ section, isEditing, userId, onUpdate, onDelete }: DonationBlockProps) {
  const content = section.content as {
    title?: string;
    message?: string;
    icon?: keyof typeof ICONS;
    presetAmounts?: number[];
    paypalEmail?: string;
  };

  const [localContent, setLocalContent] = useState({
    title: content.title || 'Support My Work',
    message: content.message || 'If you enjoy what I create, consider leaving a tip!',
    icon: content.icon || 'heart',
    presetAmounts: content.presetAmounts || PRESET_AMOUNTS,
    paypalEmail: content.paypalEmail || '',
  });

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const Icon = ICONS[localContent.icon as keyof typeof ICONS] || Heart;

  const handleSave = () => {
    onUpdate(localContent);
  };

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) {
      toast.error('Please select or enter an amount');
      return;
    }
    
    if (!localContent.paypalEmail) {
      toast.error('Donation not configured');
      return;
    }

    // Redirect to PayPal
    const paypalUrl = `https://www.paypal.com/paypalme/${localContent.paypalEmail}/${amount}`;
    window.open(paypalUrl, '_blank');
  };

  if (!isEditing) {
    // View mode
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{localContent.title}</h3>
          <p className="text-muted-foreground mb-6">{localContent.message}</p>
          
          {/* Preset Amounts */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {localContent.presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
              >
                ${amount}
              </Button>
            ))}
          </div>
          
          {/* Custom Amount */}
          <div className="flex gap-2 max-w-xs mx-auto mb-4">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Custom"
                className="pl-8"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleDonate}
            className="gap-2"
            disabled={!localContent.paypalEmail}
          >
            <Heart className="h-4 w-4" />
            Send Tip
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLocalContent(prev => ({ ...prev, icon: 'heart' }))}>
              <Heart className="h-4 w-4 mr-2" />
              Heart Icon
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocalContent(prev => ({ ...prev, icon: 'coffee' }))}>
              <Coffee className="h-4 w-4 mr-2" />
              Coffee Icon
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocalContent(prev => ({ ...prev, icon: 'gift' }))}>
              <Gift className="h-4 w-4 mr-2" />
              Gift Icon
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" />
          Donation / Tip Jar
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={localContent.title}
            onChange={(e) => setLocalContent(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Support My Work"
          />
        </div>
        
        <div>
          <Label>Message</Label>
          <Textarea
            value={localContent.message}
            onChange={(e) => setLocalContent(prev => ({ ...prev, message: e.target.value }))}
            placeholder="A short message to supporters..."
            rows={2}
          />
        </div>
        
        <div>
          <Label>PayPal.me Username</Label>
          <Input
            value={localContent.paypalEmail}
            onChange={(e) => setLocalContent(prev => ({ ...prev, paypalEmail: e.target.value }))}
            placeholder="yourpaypalme"
          />
          <p className="text-xs text-muted-foreground mt-1">
            From paypal.me/yourpaypalme
          </p>
        </div>

        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
