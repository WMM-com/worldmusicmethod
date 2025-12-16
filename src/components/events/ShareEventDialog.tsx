import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { Share2, X, UserCheck, Eye, EyeOff } from 'lucide-react';
import { Event } from '@/types/database';

interface ShareEventDialogProps {
  event: Event;
  trigger?: React.ReactNode;
}

type FeeVisibilityOption = 'hide' | 'show' | 'custom';

export function ShareEventDialog({ event, trigger }: ShareEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [feeVisibility, setFeeVisibility] = useState<FeeVisibilityOption>('hide');
  const [customFee, setCustomFee] = useState<number>(0);
  
  const { shareEvent, unshareEvent, updateShare, getEventShares } = useSharedEvents();
  const shares = getEventShares(event.id);

  const handleShare = async () => {
    if (!email.trim()) return;
    
    await shareEvent.mutateAsync({
      eventId: event.id,
      email: email.trim().toLowerCase(),
      canSeeFee: feeVisibility !== 'hide',
      customFee: feeVisibility === 'custom' ? customFee : undefined,
    });
    
    setEmail('');
    setFeeVisibility('hide');
    setCustomFee(0);
  };

  const handleRemoveShare = (shareId: string) => {
    if (confirm('Remove this bandmate from this event?')) {
      unshareEvent.mutate(shareId);
    }
  };

  const handleToggleFeeVisibility = (shareId: string, currentValue: boolean) => {
    updateShare.mutate({ shareId, canSeeFee: !currentValue });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Event with Bandmates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {event.venue_name && `${event.venue_name} • `}
              {new Date(event.start_time).toLocaleDateString()}
            </p>
            <p className="text-sm font-medium mt-1">Your fee: {formatCurrency(event.fee)}</p>
          </div>

          {/* Add new share */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Bandmate's Email</Label>
              <Input
                type="email"
                placeholder="bandmate@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fee Visibility</Label>
              <RadioGroup value={feeVisibility} onValueChange={(v) => setFeeVisibility(v as FeeVisibilityOption)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="hide" />
                  <Label htmlFor="hide" className="text-sm font-normal cursor-pointer">
                    Hide fee
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="show" id="show" />
                  <Label htmlFor="show" className="text-sm font-normal cursor-pointer">
                    Show actual fee ({formatCurrency(event.fee)})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="text-sm font-normal cursor-pointer">
                    Show a different fee
                  </Label>
                </div>
              </RadioGroup>
              
              {feeVisibility === 'custom' && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm text-muted-foreground">Custom fee to display</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={customFee}
                    onChange={(e) => setCustomFee(parseFloat(e.target.value) || 0)}
                    className="max-w-[150px]"
                  />
                </div>
              )}
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleShare}
              disabled={!email.trim() || shareEvent.isPending}
            >
              {shareEvent.isPending ? 'Sharing...' : 'Share Event'}
            </Button>
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Shared with</Label>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {share.shared_with_email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{share.shared_with_email}</p>
                        <div className="flex items-center gap-2">
                          {share.acknowledged ? (
                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFeeVisibility(share.id, share.can_see_fee ?? false)}
                        title={share.can_see_fee ? 'Hide fee' : 'Show fee'}
                      >
                        {share.can_see_fee ? (
                          <Eye className="h-4 w-4 text-success" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Bandmates receive a read-only view of this event</li>
              <li>You control whether they see the fee (or a different amount)</li>
              <li>They can acknowledge to confirm they've seen the details</li>
              <li>If you update the event, they'll need to re-acknowledge</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
