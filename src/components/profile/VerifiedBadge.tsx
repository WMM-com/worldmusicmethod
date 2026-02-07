import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import verifiedBadgeImg from '@/assets/verified-badge.png';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Verified badge using uploaded image asset.
 * Shown next to verified user names.
 */
export function VerifiedBadge({ size = 'md', className }: VerifiedBadgeProps) {
  const sizeMap = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const px = sizeMap[size];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={verifiedBadgeImg}
            alt="Verified account"
            width={px}
            height={px}
            className={cn('inline-block shrink-0', className)}
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
