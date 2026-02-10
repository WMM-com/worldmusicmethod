/**
 * ConnectStorefrontSuccess
 * 
 * Simple success page shown after a customer completes a purchase
 * on a connected account's storefront.
 */
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';

export default function ConnectStorefrontSuccess() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>
          {sessionId && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Session: {sessionId}
            </p>
          )}
          <Link to={`/store/${accountId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
