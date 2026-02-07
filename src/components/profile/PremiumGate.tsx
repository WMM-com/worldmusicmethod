import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumGateProps {
  /** Whether the user has premium features enabled */
  hasPremiumFeatures: boolean;
  /** Feature name to display in the upgrade prompt */
  featureName: string;
  /** Optional description of what the feature does */
  featureDescription?: string;
  /** Content to render if user has premium access */
  children: ReactNode;
  /** Optional class name for the wrapper */
  className?: string;
  /** Render mode: 'block' shows upgrade card, 'inline' shows subtle lock icon */
  mode?: 'block' | 'inline';
}

export function PremiumGate({
  hasPremiumFeatures,
  featureName,
  featureDescription,
  children,
  className,
  mode = 'block',
}: PremiumGateProps) {
  if (hasPremiumFeatures) {
    return <>{children}</>;
  }

  if (mode === 'inline') {
    return (
      <div className={cn('relative', className)}>
        <div className="opacity-50 pointer-events-none blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Link to="/membership">
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="h-3 w-3" />
              Unlock
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <UpgradePrompt
      featureName={featureName}
      featureDescription={featureDescription}
      className={className}
    />
  );
}

interface UpgradePromptProps {
  featureName: string;
  featureDescription?: string;
  className?: string;
}

export function UpgradePrompt({ featureName, featureDescription, className }: UpgradePromptProps) {
  return (
    <Card className={cn('border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5', className)}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Unlock Premium Profile Features
        </CardTitle>
        {featureDescription ? (
          <CardDescription className="text-sm">
            {featureDescription}
          </CardDescription>
        ) : (
          <CardDescription className="text-sm">
            {featureName} and more with Beta Membership
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="text-center pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          Get commerce blocks, brand colors, unlimited sections, and more.
        </p>
        <Link to="/membership">
          <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            <Crown className="h-4 w-4" />
            Join Beta ($10 suggested)
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-3">
          Start your free trial — cancel anytime
        </p>
      </CardContent>
    </Card>
  );
}

/** Small badge to show in the profile editor when premium is active */
export function PremiumActiveBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5 text-xs">
      <Crown className="h-3 w-3" />
      Premium Features Active
    </Badge>
  );
}

/**
 * Hook to check premium status.
 * Primary: has_premium_features flag from extended_profiles.
 * Fallback: checks if activeSubscriptionProductIds includes beta_membership.
 */
export function usePremiumCheck(
  hasPremiumFeatures: boolean | null | undefined,
  activeSubscriptionProductIds?: string[] | null,
) {
  const isPremium =
    hasPremiumFeatures === true ||
    (activeSubscriptionProductIds?.includes('beta_membership') ?? false);

  return {
    isPremium,
    canAddMoreSections: (currentCount: number) =>
      isPremium || currentCount < 3,
  };
}
