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

  const queryConversationId = (() => {
    const params = new URLSearchParams(location.search);
    return params.get('conversation') || params.get('id');
  })();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() =>
    location.state?.conversationId || queryConversationId || null
  );

  // Auto-open when coming from other places (Members/Friends/Profile)
  useEffect(() => {
    const nextId = location.state?.conversationId || queryConversationId || null;
    if (nextId) setSelectedConversationId(nextId);
  }, [location.state?.conversationId, queryConversationId]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);
  const participantName = selectedConversation?.participants?.[0]?.full_name || 'Conversation';
  const participantId = selectedConversation?.participants?.[0]?.id;
  const participantUsername = selectedConversation?.participants?.[0]?.username;

  if (loading || !user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black">
      <SiteHeader />
      <div className="flex-1 flex flex-col min-h-0">
        <header className="border-b border-neutral-800 bg-[#0a0a0a] shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Messages</h1>
                <p className="text-sm text-neutral-400">Your conversations</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 max-w-6xl mx-auto px-4 py-4 w-full bg-black">
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
                  participantId={participantId}
                  participantUsername={participantUsername || undefined}
                />
              ) : (
                <Card className="h-full flex items-center justify-center border-neutral-800 bg-[#0a0a0a]">
                  <CardContent className="text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-neutral-500" />
                    </div>
                    <h3 className="font-semibold mb-2 text-white">Select a conversation</h3>
                    <p className="text-neutral-500">
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