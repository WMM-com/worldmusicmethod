import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Check, X } from 'lucide-react';
import { useMyGroupInvites, useRespondToInvite } from '@/hooks/useGroups';

export function PendingInvitesBanner() {
  const { data: invites, isLoading } = useMyGroupInvites();
  const respondToInvite = useRespondToInvite();
  
  if (isLoading || !invites?.length) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Pending Group Invites</h3>
        </div>
        <div className="space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(invite.group as any)?.cover_image_url || undefined} />
                  <AvatarFallback>{(invite.group as any)?.name?.[0] || 'G'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{(invite.group as any)?.name || 'Unknown Group'}</p>
                  <p className="text-xs text-muted-foreground">You've been invited to join</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respondToInvite.mutate({ 
                    inviteId: invite.id, 
                    groupId: invite.group_id, 
                    accept: true 
                  })}
                  disabled={respondToInvite.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToInvite.mutate({ 
                    inviteId: invite.id, 
                    groupId: invite.group_id, 
                    accept: false 
                  })}
                  disabled={respondToInvite.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
