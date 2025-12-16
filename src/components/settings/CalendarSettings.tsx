import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCalendarSync, CalendarProvider } from '@/hooks/useCalendarSync';
import { Calendar, Check, RefreshCw, Unlink } from 'lucide-react';
import { format } from 'date-fns';

const PROVIDERS: { id: CalendarProvider; name: string; icon: string; color: string }[] = [
  { id: 'google', name: 'Google Calendar', icon: '📅', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { id: 'outlook', name: 'Outlook Calendar', icon: '📆', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'yahoo', name: 'Yahoo Calendar', icon: '📅', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'apple', name: 'Apple Calendar', icon: '🍎', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
];

export function CalendarSettings() {
  const {
    connections,
    isLoading,
    connectCalendar,
    disconnectCalendar,
    syncEvents,
    isConnected,
    getConnection,
  } = useCalendarSync();

  const handleConnect = (provider: CalendarProvider) => {
    connectCalendar.mutate(provider);
  };

  const handleDisconnect = (provider: CalendarProvider) => {
    if (confirm(`Disconnect ${PROVIDERS.find(p => p.id === provider)?.name}?`)) {
      disconnectCalendar.mutate(provider);
    }
  };

  const handleSync = (provider: CalendarProvider) => {
    syncEvents.mutate({ provider });
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integrations
        </CardTitle>
        <CardDescription>
          Connect your calendars for two-way sync. Events created in Left Brain will automatically appear in your connected calendars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.id);
          const connection = getConnection(provider.id);
          const isPending = connectCalendar.isPending || disconnectCalendar.isPending;
          const isSyncing = syncEvents.isPending;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {provider.name}
                    {connected && (
                      <Badge variant="outline" className={provider.color}>
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  {connected && connection && (
                    <p className="text-xs text-muted-foreground">
                      Connected {format(new Date(connection.connected_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(provider.id)}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(provider.id)}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(provider.id)}
                    disabled={isPending}
                  >
                    {isPending ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Setup Required:</p>
          <p>To enable calendar sync, you'll need to configure OAuth credentials for each provider in the project settings:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET</li>
            <li>Outlook: OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET</li>
            <li>Yahoo: YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET</li>
            <li>Apple: APPLE_CLIENT_ID, APPLE_CLIENT_SECRET</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
