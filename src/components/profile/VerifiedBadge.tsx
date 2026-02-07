import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Verified badge shown next to user names.
 * Awarded when a user has verified their email AND set a username.
 * Uses theme primary color for consistency.
 */
export function VerifiedBadge({ size = 'md', className }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4.5 w-4.5',
    lg: 'h-5.5 w-5.5',
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle2
            className={cn(
              'inline-block shrink-0 text-primary fill-primary stroke-primary-foreground',
              sizeClasses[size],
              className
            )}
            aria-label="Verified account"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Verified Account</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper to determine if a user qualifies for the verified badge.
 * Criteria: email_verified === true AND username is set (non-empty).
 */
export function isUserVerified(profile: {
  email_verified?: boolean | null;
  username?: string | null;
}): boolean {
  return profile.email_verified === true && !!profile.username?.trim();
}
