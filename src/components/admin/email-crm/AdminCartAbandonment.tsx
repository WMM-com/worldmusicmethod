import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, RefreshCw, Mail, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CartAbandonment {
  id: string;
  user_id: string | null;
  email: string | null;
  cart_items: any[];
  cart_total: number;
  currency: string;
  abandoned_at: string;
  recovered_at: string | null;
  recovery_email_sent: boolean;
  sequence_enrollment_id: string | null;
}

export function AdminCartAbandonment() {
  const [abandonments, setAbandonments] = useState<CartAbandonment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, recovered: 0, pending: 0 });

  useEffect(() => {
    fetchAbandonments();
  }, []);

  async function fetchAbandonments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_abandonment')
      .select('*')
      .order('abandoned_at', { ascending: false })
      .limit(100);
    
    if (error) {
      toast.error('Failed to load cart abandonments');
    } else {
      const items = (data || []) as CartAbandonment[];
      setAbandonments(items);
      
      const recovered = items.filter(a => a.recovered_at).length;
      setStats({
        total: items.length,
        recovered,
        pending: items.filter(a => !a.recovered_at && !a.recovery_email_sent).length
      });
    }
    setLoading(false);
  }

  async function triggerRecoveryEmail(id: string) {
    // This would call an edge function to process the recovery email
    const { error } = await supabase.functions.invoke('process-cart-abandonment', {
      body: { abandonmentId: id }
    });

    if (error) {
      toast.error('Failed to trigger recovery email');
    } else {
      toast.success('Recovery email triggered');
      fetchAbandonments();
    }
  }

  function formatCartItems(items: any[]): string {
    if (!Array.isArray(items)) return '-';
    return items.map(i => i.name || i.productName || 'Unknown').join(', ');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart Abandonment
            </CardTitle>
            <CardDescription>
              Track abandoned carts and recovery emails
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchAbandonments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Abandoned</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{stats.recovered}</p>
            <p className="text-sm text-muted-foreground">Recovered</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending Recovery</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : abandonments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No abandoned carts recorded</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Abandoned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abandonments.map(cart => (
                <TableRow key={cart.id}>
                  <TableCell>
                    {cart.email || (cart.user_id ? 'Registered User' : 'Unknown')}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {formatCartItems(cart.cart_items)}
                  </TableCell>
                  <TableCell>
                    {cart.currency} {cart.cart_total?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {cart.recovered_at ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Recovered
                      </Badge>
                    ) : cart.recovery_email_sent ? (
                      <Badge variant="secondary">
                        <Mail className="h-3 w-3 mr-1" />
                        Email Sent
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!cart.recovered_at && !cart.recovery_email_sent && cart.email && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => triggerRecoveryEmail(cart.id)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Recovery
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">How Cart Abandonment Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Carts are tracked when users add items but don't complete checkout</li>
            <li>• Before sending recovery emails, the system checks if the user already owns the course</li>
            <li>• Recovery emails include a direct link back to checkout</li>
            <li>• Carts are marked as recovered when the purchase is completed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
