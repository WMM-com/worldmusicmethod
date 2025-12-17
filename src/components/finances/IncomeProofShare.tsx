import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIncomeProofShares, IncomeProofShare } from '@/hooks/useIncomeProofShares';
import { Share2, Copy, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function IncomeProofShareSection() {
  const { shares, loading, createShare, deleteShare } = useIncomeProofShares();
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState({
    include_income_summary: true,
    include_monthly_breakdown: true,
    include_tax_calculations: false,
    include_other_income: true,
  });
  const [validDays, setValidDays] = useState<string>('30');

  const handleCreate = async () => {
    setCreating(true);
    const validUntil = validDays 
      ? new Date(Date.now() + parseInt(validDays) * 24 * 60 * 60 * 1000)
      : null;
    
    await createShare({
      ...options,
      valid_until: validUntil,
    });
    setCreating(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/income-proof/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const openLink = (token: string) => {
    window.open(`/income-proof/${token}`, '_blank');
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Income Proof Sharing
        </CardTitle>
        <CardDescription>
          Generate secure links to share your income details with landlords or mortgage advisors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new share */}
        <div className="space-y-4 p-4 border border-border rounded-lg">
          <h3 className="font-medium">Create New Share Link</h3>
          
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="income_summary"
                checked={options.include_income_summary}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, include_income_summary: !!checked }))
                }
              />
              <Label htmlFor="income_summary">Income Summary (total earnings)</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="monthly_breakdown"
                checked={options.include_monthly_breakdown}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, include_monthly_breakdown: !!checked }))
                }
              />
              <Label htmlFor="monthly_breakdown">Monthly Breakdown (last 12 months)</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="other_income"
                checked={options.include_other_income}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, include_other_income: !!checked }))
                }
              />
              <Label htmlFor="other_income">Other Income Sources</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="tax_calculations"
                checked={options.include_tax_calculations}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, include_tax_calculations: !!checked }))
                }
              />
              <Label htmlFor="tax_calculations">Tax Calculations</Label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="valid_days" className="whitespace-nowrap">Expires in:</Label>
            <Input
              id="valid_days"
              type="number"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              className="w-20"
              min="1"
              max="365"
            />
            <span className="text-sm text-muted-foreground">days (leave empty for no expiry)</span>
          </div>

          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Generate Share Link'}
          </Button>
        </div>

        {/* Existing shares */}
        {loading ? (
          <p className="text-muted-foreground">Loading shares...</p>
        ) : shares.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium">Active Share Links</h3>
            {shares.map((share) => (
              <ShareLinkItem 
                key={share.id} 
                share={share} 
                onCopy={copyLink} 
                onOpen={openLink}
                onDelete={deleteShare} 
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active share links</p>
        )}
      </CardContent>
    </Card>
  );
}

function ShareLinkItem({ 
  share, 
  onCopy, 
  onOpen,
  onDelete 
}: { 
  share: IncomeProofShare; 
  onCopy: (token: string) => void;
  onOpen: (token: string) => void;
  onDelete: (id: string) => void;
}) {
  const isExpired = share.valid_until && new Date(share.valid_until) < new Date();
  
  const includedSections = [
    share.include_income_summary && 'Income Summary',
    share.include_monthly_breakdown && 'Monthly Breakdown',
    share.include_other_income && 'Other Income',
    share.include_tax_calculations && 'Tax Calculations',
  ].filter(Boolean);

  return (
    <div className={`flex items-center justify-between p-3 border border-border rounded-lg ${isExpired ? 'opacity-50' : ''}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            Created {format(new Date(share.created_at), 'MMM d, yyyy')}
          </span>
          {share.valid_until && (
            <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
              • {isExpired ? 'Expired' : `Expires ${format(new Date(share.valid_until), 'MMM d, yyyy')}`}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Includes: {includedSections.join(', ')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onOpen(share.share_token)}
          disabled={isExpired}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onCopy(share.share_token)}
          disabled={isExpired}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onDelete(share.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
