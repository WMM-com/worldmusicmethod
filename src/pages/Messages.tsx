import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageThread } from '@/components/messaging/MessageThread';
import { useConversations } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: conversations } = useConversations();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    location.state?.conversationId || null
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);
  const participantName = selectedConversation?.participants?.[0]?.full_name || 'Conversation';

  if (loading || !user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SiteHeader />
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <header className="border-b border-border bg-card shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-sm text-muted-foreground">Your conversations</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 max-w-6xl mx-auto px-4 py-4 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Conversation List */}
            <div className="lg:col-span-1 h-full overflow-hidden">
              <ConversationList
                onSelectConversation={setSelectedConversationId}
                selectedId={selectedConversationId || undefined}
              />
            </div>

            {/* Message Thread */}
            <div className="lg:col-span-2 h-full overflow-hidden">
              {selectedConversationId ? (
                <MessageThread
                  conversationId={selectedConversationId}
                  participantName={participantName}
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the list to start messaging
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
