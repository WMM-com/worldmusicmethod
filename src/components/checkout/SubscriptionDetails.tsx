import { format, addDays } from 'date-fns';
import { Calendar, Info } from 'lucide-react';
import { formatPrice } from '@/hooks/useGeoPricing';

interface SubscriptionDetailsProps {
  productName: string;
  price: number;
  currency: string;
  interval: string;
  trialEnabled?: boolean;
  trialLengthDays?: number;
  trialPrice?: number;
}

export function SubscriptionDetails({
  productName,
  price,
  currency,
  interval,
  trialEnabled,
  trialLengthDays,
  trialPrice,
}: SubscriptionDetailsProps) {
  const today = new Date();
  const intervalLabel = interval === 'annual' ? 'year' : interval?.replace('ly', '') || 'month';
  
  // Calculate next payment date
  const getNextPaymentDate = () => {
    if (trialEnabled && trialLengthDays) {
      return addDays(today, trialLengthDays);
    }
    // If no trial, first payment is today
    return today;
  };

  const nextPaymentDate = getNextPaymentDate();
  const isTrial = trialEnabled && trialLengthDays && trialLengthDays > 0;
  const isFreeTrial = isTrial && (!trialPrice || trialPrice === 0);

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
      <div className="flex items-start gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          {isTrial ? (
            <>
              <p className="font-medium">
                {isFreeTrial 
                  ? `${trialLengthDays}-day free trial` 
                  : `${trialLengthDays}-day trial for ${formatPrice(trialPrice || 0, currency)}`
                }
              </p>
              <p className="text-muted-foreground">
                First payment of {formatPrice(price, currency)} on {format(nextPaymentDate, 'MMM d, yyyy')}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Billed {formatPrice(price, currency)}/{intervalLabel} starting today
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-green-600">
        <Info className="h-3 w-3" />
        <span>Cancel anytime, no questions asked</span>
      </div>
    </div>
  );
}
