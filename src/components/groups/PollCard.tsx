import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pin, PinOff, MoreHorizontal, Trash2, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GroupPoll } from '@/types/groups';

interface PollCardProps {
  poll: GroupPoll;
  isAdmin: boolean;
  groupId: string;
  canPin?: boolean;
  onVote: (pollId: string, optionIndex: number) => void;
  onPin: (pollId: string, pinned: boolean) => void;
  onDelete: (pollId: string) => void;
}

export function PollCard({ poll, isAdmin, groupId, canPin = true, onVote, onPin, onDelete }: PollCardProps) {
  const totalVotes = poll.votes?.reduce((sum, v) => sum + v.count, 0) || 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">{poll.question}</CardTitle>
            {poll.is_pinned && <Badge className="text-xs bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(canPin || poll.is_pinned) && (
                  <DropdownMenuItem onClick={() => onPin(poll.id, !poll.is_pinned)} disabled={!canPin && !poll.is_pinned}>
                    {poll.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                    {poll.is_pinned ? 'Unpin' : 'Pin to top'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(poll.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {poll.is_multiple_choice && <p className="text-sm text-muted-foreground">Select multiple options</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {poll.options.map((option, index) => {
            const voteCount = poll.votes?.find(v => v.option_index === index)?.count || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const hasVotedThisOption = poll.user_votes?.includes(index);
            const hasVotedAny = (poll.user_votes?.length || 0) > 0;
            const canClick = poll.is_multiple_choice || !hasVotedAny || hasVotedThisOption;
            
            return (
              <button 
                key={index}
                onClick={() => onVote(poll.id, index)}
                disabled={!canClick}
                className={`relative w-full p-3 rounded-lg border text-left transition-colors ${
                  hasVotedThisOption ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                } ${canClick ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              >
                <div className="absolute inset-0 bg-primary/10 rounded-lg transition-all" style={{ width: `${percentage}%` }} />
                <div className="relative flex justify-between">
                  <span>{option}</span>
                  <span className="text-sm text-muted-foreground">{percentage}% ({voteCount})</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {poll.ends_at && ` • Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`}
        </p>
      </CardContent>
    </Card>
  );
}
