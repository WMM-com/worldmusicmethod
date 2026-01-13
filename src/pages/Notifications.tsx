import { useState } from 'react';
import { Bell, Check, Trash2, User, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteHeader } from '@/components/layout/SiteHeader';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const navigate = useNavigate();

  const filteredNotifications = notifications?.filter(n => 
    filter === 'all' || !n.is_read
  ) || [];

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Navigate based on notification type - add timestamp to force scroll even if already on feed
    if (notification.reference_type === 'post' && notification.reference_id) {
      navigate(`/community?tab=feed&postId=${notification.reference_id}&t=${Date.now()}`);
    } else if (notification.reference_type === 'friendship') {
      navigate('/community?tab=friends');
    } else if (notification.reference_type === 'conversation') {
      navigate('/messages', { state: { conversationId: notification.reference_id } });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return '👋';
      case 'friend_accepted':
        return '🤝';
      case 'appreciation':
        return '⭐';
      case 'comment':
        return '💬';
      case 'mention':
        return '📢';
      case 'message':
        return '✉️';
      case 'booking_request':
        return '📅';
      default:
        return '🔔';
    }
  };

  const getNotificationCategory = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return 'Friends';
      case 'appreciation':
      case 'comment':
      case 'mention':
        return 'Social';
      case 'message':
        return 'Messages';
      default:
        return 'Other';
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Notifications</h1>
                  <p className="text-muted-foreground">
                    {unreadCount ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              {unreadCount && unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => markAllRead.mutate()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount ? `(${unreadCount})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              {isLoading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading notifications...
                  </CardContent>
                </Card>
              ) : filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      {filter === 'unread' 
                        ? "You're all caught up!" 
                        : "Notifications will appear here"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={cn(
                        'transition-colors cursor-pointer hover:bg-muted/50',
                        !notification.is_read && 'bg-primary/5 border-primary/20'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {notification.from_user ? (
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={notification.from_user.avatar_url || undefined} />
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                              {getNotificationIcon(notification.type)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {getNotificationCategory(notification.type)}
                                  </span>
                                  {!notification.is_read && (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="font-medium break-words">{notification.title}</p>
                                {notification.message && (
                                  <p className="text-sm text-muted-foreground break-words mt-1">
                                    {notification.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification.mutate(notification.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
