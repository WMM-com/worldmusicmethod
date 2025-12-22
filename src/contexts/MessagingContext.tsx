import { createContext, useContext, useState, ReactNode } from 'react';

interface PopupConversation {
  id: string;
  participantName: string;
  participantAvatar?: string;
}

interface MessagingContextType {
  popupConversation: PopupConversation | null;
  openPopupChat: (conversation: PopupConversation) => void;
  closePopupChat: () => void;
  minimizePopupChat: () => void;
  isMinimized: boolean;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [popupConversation, setPopupConversation] = useState<PopupConversation | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const openPopupChat = (conversation: PopupConversation) => {
    setPopupConversation(conversation);
    setIsMinimized(false);
  };

  const closePopupChat = () => {
    setPopupConversation(null);
    setIsMinimized(false);
  };

  const minimizePopupChat = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <MessagingContext.Provider value={{
      popupConversation,
      openPopupChat,
      closePopupChat,
      minimizePopupChat,
      isMinimized,
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessagingPopup() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessagingPopup must be used within a MessagingProvider');
  }
  return context;
}
