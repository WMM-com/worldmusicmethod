import { useState, forwardRef, SVGProps } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferralCode, useUserCredits, useReferralStats } from '@/hooks/useReferral';
import { toast } from 'sonner';
import { 
  Gift, 
  Copy, 
  Check, 
  DollarSign,
  Users,
  UserCheck,
} from 'lucide-react';

// Social share icons as forwardRef components to avoid ref warnings
const TwitterIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
));
TwitterIcon.displayName = 'TwitterIcon';

const WhatsAppIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
));
WhatsAppIcon.displayName = 'WhatsAppIcon';

const EmailIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
));
EmailIcon.displayName = 'EmailIcon';

export function ReferralSection() {
  const [copied, setCopied] = useState(false);
  const { data: referralData, isLoading: referralLoading } = useReferralCode();
  const { data: credits, isLoading: creditsLoading } = useUserCredits();
  const { data: stats } = useReferralStats();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = referralData?.referral_code 
    ? `${baseUrl}/?ref=${referralData.referral_code}` 
    : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareMessage = "Join me on World Music Method! Learn music from around the world.";
  
  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Join me on World Music Method!');
    const body = encodeURIComponent(`${shareMessage}\n\n${referralLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const formatCredits = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (referralLoading || creditsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Invite Friends</CardTitle>
          </div>
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCredits(credits?.balance || 0)} credits
          </Badge>
        </div>
        <CardDescription>
          Share your unique link and earn credits when friends sign up!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="flex gap-2">
          <Input 
            value={referralLink} 
            readOnly 
            className="font-mono text-sm bg-muted"
          />
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleTwitterShare}
            className="gap-2"
          >
            <TwitterIcon />
            Twitter
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-2"
          >
            <WhatsAppIcon />
            WhatsApp
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmailShare}
            className="gap-2"
          >
            <EmailIcon />
            Email
          </Button>
        </div>

        {/* Stats */}
        {(stats?.signedUp || 0) > 0 && (
          <div className="flex gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{stats?.signedUp || 0} signed up</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              <span>{stats?.converted || 0} converted</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
