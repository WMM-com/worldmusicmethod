import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Trash2, RotateCcw, Trash } from 'lucide-react';
import { Event } from '@/types/database';

interface DeletedEventsTabProps {
  deletedEvents: Event[];
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyBin: () => Promise<void>;
  isLoading?: boolean;
}

export function DeletedEventsTab({ 
  deletedEvents, 
  onRestore, 
  onPermanentDelete, 
  onEmptyBin,
  isLoading 
}: DeletedEventsTabProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    await onRestore(id);
    setRestoringId(null);
  };

  const handlePermanentDelete = async (id: string) => {
    setDeletingId(id);
    await onPermanentDelete(id);
    setDeletingId(null);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (deletedEvents.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Bin is empty</h3>
          <p className="text-muted-foreground">Deleted events will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash className="h-4 w-4 mr-2" />
              Empty Bin
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Empty bin?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {deletedEvents.length} events in the bin. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onEmptyBin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-3">
        {deletedEvents.map((event) => (
          <Card key={event.id} className="glass opacity-75">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium line-through text-muted-foreground">{event.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{event.event_type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.venue_name && `${event.venue_name} • `}
                    {format(new Date(event.start_time), 'EEE, MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {(event as any).deleted_at ? format(new Date((event as any).deleted_at), 'PPp') : 'recently'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRestore(event.id)}
                    disabled={restoringId === event.id}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {restoringId === event.id ? 'Restoring...' : 'Restore'}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={deletingId === event.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{event.title}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handlePermanentDelete(event.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
