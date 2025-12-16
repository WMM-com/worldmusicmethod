import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { format } from 'date-fns';
import { Users, Calendar, MapPin, Check, Eye, EyeOff, Clock } from 'lucide-react';

export default function SharedWithMe() {
  const { sharedWithMe, isLoading, acknowledgeEvent } = useSharedEvents();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const handleAcknowledge = (shareId: string) => {
    acknowledgeEvent.mutate(shareId);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Shared With Me
          </h1>
          <p className="text-muted-foreground mt-1">
            Events that bandmates have shared with you
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading shared events...</div>
        ) : sharedWithMe.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shared events</h3>
              <p className="text-muted-foreground">
                When bandmates share events with you, they'll appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sharedWithMe.map((share) => (
              <Card key={share.id} className="glass overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Event details */}
                    <div className="flex-1 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">
                              {share.event?.title || 'Untitled Event'}
                            </h3>
                            <Badge variant="outline" className="capitalize">
                              {share.event?.event_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Shared by {share.sharer?.full_name || share.sharer?.email || 'Unknown'}
                          </p>
                        </div>
                        
                        {!share.acknowledged ? (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(share.id)}
                            disabled={acknowledgeEvent.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        ) : (
                          <Badge className="bg-success/20 text-success border-success/20">
                            <Check className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {share.event?.start_time 
                              ? format(new Date(share.event.start_time), 'EEE, MMM d, yyyy')
                              : 'No date'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {share.event?.start_time 
                              ? format(new Date(share.event.start_time), 'h:mm a')
                              : 'No time'}
                            {share.event?.end_time && (
                              <> - {format(new Date(share.event.end_time), 'h:mm a')}</>
                            )}
                          </span>
                        </div>
                        
                        {share.event?.venue_name && (
                          <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {share.event.venue_name}
                              {share.event.venue_address && ` - ${share.event.venue_address}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {share.event?.notes && (
                        <div className="p-3 rounded-lg bg-muted/30 text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Notes</p>
                          <p>{share.event.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Fee section */}
                    <div className="lg:w-48 p-4 bg-muted/20 border-t lg:border-t-0 lg:border-l flex flex-col justify-center items-center">
                      {share.can_see_fee ? (
                        <>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Eye className="h-3 w-3" />
                            Fee
                          </div>
                          <p className="text-2xl font-bold">
                            {formatCurrency(share.event?.fee || 0)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <EyeOff className="h-3 w-3" />
                            Fee Hidden
                          </div>
                          <p className="text-lg text-muted-foreground">
                            Not visible
                          </p>
                        </>
                      )}
                      
                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className={`text-xs capitalize ${
                          share.event?.status === 'confirmed' ? 'bg-success/10 text-success' :
                          share.event?.status === 'pending' ? 'bg-warning/10 text-warning' :
                          ''
                        }`}>
                          {share.event?.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
