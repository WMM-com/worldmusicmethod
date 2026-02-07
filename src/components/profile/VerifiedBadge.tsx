import { cn } from '@/lib/utils';
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
 * Scalloped seal verified badge (like social media platforms).
 * Uses theme primary color. Shown next to verified user names.
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={px}
            height={px}
            className={cn('inline-block shrink-0', className)}
            aria-label="Verified account"
            role="img"
          >
            {/* Scalloped seal shape */}
            <path
              d="M12 1.5l1.72 2.58a1 1 0 00.87.46l3.08-.12a1 1 0 01.98.74l.72 3a1 1 0 00.58.65l2.82 1.22a1 1 0 01.5 1.22l-1.02 2.92a1 1 0 000 .66l1.02 2.92a1 1 0 01-.5 1.22l-2.82 1.22a1 1 0 00-.58.65l-.72 3a1 1 0 01-.98.74l-3.08-.12a1 1 0 00-.87.46L12 22.5l-1.72-2.58a1 1 0 00-.87-.46l-3.08.12a1 1 0 01-.98-.74l-.72-3a1 1 0 00-.58-.65l-2.82-1.22a1 1 0 01-.5-1.22l1.02-2.92a1 1 0 000-.66L.73 6.25a1 1 0 01.5-1.22l2.82-1.22a1 1 0 00.58-.65l.72-3a1 1 0 01.98-.74l3.08.12a1 1 0 00.87-.46L12 1.5z"
              className="fill-primary"
            />
            {/* Checkmark */}
            <path
              d="M9.5 12.5l2 2 3.5-4"
              fill="none"
              className="stroke-primary-foreground"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
