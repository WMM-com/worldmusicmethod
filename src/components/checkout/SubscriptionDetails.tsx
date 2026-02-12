import { format, addDays, addMonths, addYears, isValid } from 'date-fns';
import { Calendar, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/hooks/useGeoPricing';

// Safe date formatter that never throws "Invalid time value"
function safeFormat(date: Date, fmt: string): string {
  try {
    if (!date || !isValid(date)) {
      return 'upcoming';
    }
    return format(date, fmt);
  } catch {
    return 'upcoming';
  }
}

interface SubscriptionDetailsProps {
  productName: string;
  price: number;
  currency: string;
  interval: string;
  trialEnabled?: boolean;
  trialLengthDays?: number;
  trialPrice?: number;
  paymentMethodDiscount?: number;
}

export function SubscriptionDetails({
  productName,
  price,
  currency,
  interval,
  trialEnabled,
  trialLengthDays,
  trialPrice,
  paymentMethodDiscount = 0,
}: SubscriptionDetailsProps) {
  const today = new Date();
  
  // Normalize interval to handle various formats
  const normalizedInterval = interval?.toLowerCase().replace('ly', '') || 'month';
  const intervalLabels: Record<string, string> = {
    'day': 'day',
    'dai': 'day',
    'daily': 'day',
    'week': 'week',
    'month': 'month',
    'year': 'year',
    'annual': 'year',
  };
  const intervalLabel = intervalLabels[normalizedInterval] || normalizedInterval;
  
  // Safe trial days - ensure it's always a valid finite number
  const safeTrialDays = typeof trialLengthDays === 'number' && isFinite(trialLengthDays) ? trialLengthDays : 0;

  // Calculate next payment date based on trial or billing cycle
  const getNextPaymentDate = () => {
    try {
      if (trialEnabled && safeTrialDays > 0) {
        return addDays(today, safeTrialDays);
      }
      if (normalizedInterval === 'annual' || normalizedInterval === 'year') {
        return addYears(today, 1);
      }
      return addMonths(today, 1);
    } catch {
      return addDays(today, 30);
    }
  };

  const nextPaymentDate = getNextPaymentDate();
  const hasTrial = trialEnabled && safeTrialDays > 0;
  const isFreeTrial = hasTrial && (!trialPrice || trialPrice === 0);
  
  // Apply payment method discount to prices
  const effectivePrice = price - paymentMethodDiscount;
  const effectiveTrialPrice = trialPrice ? trialPrice - (trialPrice * (paymentMethodDiscount / price)) : 0;

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
      <div className="flex items-start gap-2">
        <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          {hasTrial ? (
            <>
              <p className="font-medium text-foreground">
                {isFreeTrial 
                  ? `${safeTrialDays}-day free trial` 
                  : `${safeTrialDays}-day trial for ${formatPrice(effectiveTrialPrice, currency)}`
                }
              </p>
              <p className="text-muted-foreground">
                Then {formatPrice(effectivePrice, currency)}/{intervalLabel} from {safeFormat(nextPaymentDate, 'MMM d, yyyy')}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">
                {formatPrice(effectivePrice, currency)}/{intervalLabel}
              </p>
              <p className="text-muted-foreground">
                Next payment: {safeFormat(nextPaymentDate, 'MMM d, yyyy')}
              </p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span>Cancel anytime, no questions asked</span>
      </div>
    </div>
  );
}
