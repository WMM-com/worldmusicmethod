import { format, addDays, addMonths, addYears } from 'date-fns';
import { Calendar, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/hooks/useGeoPricing';

interface SubscriptionDetailsProps {
  productName: string;
  price: number;
  currency: string;
  interval: string;
  trialEnabled?: boolean;
  trialLengthDays?: number;
  trialPrice?: number;
  paymentMethodDiscount?: number; // Amount saved with card payment
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
  
  // Normalize interval to handle various formats - map to full word labels
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
  
  // Calculate next payment date based on trial or billing cycle
  const getNextPaymentDate = () => {
    try {
      const safeDays = typeof trialLengthDays === 'number' && isFinite(trialLengthDays) ? trialLengthDays : 0;
      if (trialEnabled && safeDays > 0) {
        return addDays(today, safeDays);
      }
      // If no trial, next payment is after first billing cycle
      if (normalizedInterval === 'annual' || normalizedInterval === 'year') {
        return addYears(today, 1);
      }
      return addMonths(today, 1);
    } catch {
      // Fallback to 30 days from now if date calculation fails
      return addDays(today, 30);
    }
  };

  const nextPaymentDate = getNextPaymentDate();
  const safeTrialDays = typeof trialLengthDays === 'number' && isFinite(trialLengthDays) ? trialLengthDays : 0;
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
                  ? `${trialLengthDays}-day free trial` 
                  : `${trialLengthDays}-day trial for ${formatPrice(effectiveTrialPrice, currency)}`
                }
              </p>
              <p className="text-muted-foreground">
                Then {formatPrice(effectivePrice, currency)}/{intervalLabel} from {format(nextPaymentDate, 'MMM d, yyyy')}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">
                {formatPrice(effectivePrice, currency)}/{intervalLabel}
              </p>
              <p className="text-muted-foreground">
                Next payment: {format(nextPaymentDate, 'MMM d, yyyy')}
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
