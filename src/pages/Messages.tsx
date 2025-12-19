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
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">Your conversations</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Conversation List */}
            <div className="lg:col-span-1">
              <ConversationList
                onSelectConversation={setSelectedConversationId}
                selectedId={selectedConversationId || undefined}
              />
            </div>

            {/* Message Thread */}
            <div className="lg:col-span-2 h-full">
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
    </>
  );
}
