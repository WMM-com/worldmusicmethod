import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncLog {
  id: string;
  source: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  transactions_synced: number | null;
  error_message: string | null;
}

interface Props {
  syncLogs: SyncLog[] | undefined;
  isSyncing: boolean;
  onSyncPayPal: () => void;
  onSyncWise: () => void;
  onSyncExchangeRates: () => void;
  onSyncAll: () => void;
}

export function SyncControls({ 
  syncLogs, 
  isSyncing, 
  onSyncPayPal, 
  onSyncWise, 
  onSyncExchangeRates,
  onSyncAll 
}: Props) {
  const getLastSync = (source: string) => {
    const log = syncLogs?.find(l => l.source === source && l.status === 'completed');
    if (!log) return null;
    return log.completed_at || log.started_at;
  };

  const paypalLastSync = getLastSync('paypal');
  const wiseLastSync = getLastSync('wise');
  const ratesLastSync = getLastSync('exchange_rates');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Data Sync</CardTitle>
          <Button onClick={onSyncAll} disabled={isSyncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* PayPal */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">PayPal</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={onSyncPayPal}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {paypalLastSync 
                ? formatDistanceToNow(new Date(paypalLastSync), { addSuffix: true })
                : 'Never synced'
              }
            </div>
          </div>

          {/* Wise */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Wise</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={onSyncWise}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {wiseLastSync 
                ? formatDistanceToNow(new Date(wiseLastSync), { addSuffix: true })
                : 'Never synced'
              }
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Exchange Rates</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={onSyncExchangeRates}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {ratesLastSync 
                ? formatDistanceToNow(new Date(ratesLastSync), { addSuffix: true })
                : 'Never synced'
              }
            </div>
          </div>
        </div>

        {/* Recent sync logs */}
        {syncLogs && syncLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</h4>
            <div className="space-y-1">
              {syncLogs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {log.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-red-500" />
                    ) : (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    )}
                    <span className="capitalize">{log.source}</span>
                    {log.transactions_synced !== null && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {log.transactions_synced} txns
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
