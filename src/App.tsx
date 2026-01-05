import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { MediaPlayerProvider } from "@/contexts/MediaPlayerContext";
import { GeoPricingProvider } from "@/contexts/GeoPricingContext";
import { ChatPopup } from "@/components/messaging/ChatPopup";
import { StickyAudioPlayer } from "@/components/media/StickyAudioPlayer";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Invoices from "./pages/Invoices";
import Finances from "./pages/Finances";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import LeftBrainSettings from "./pages/LeftBrainSettings";
import SharedWithMe from "./pages/SharedWithMe";

import Documents from "./pages/Documents";
import SharedTechSpec from "./pages/SharedTechSpec";
import Courses from "./pages/Courses";
import Course from "./pages/Course";
import CourseLanding from "./pages/CourseLanding";
import MyCourses from "./pages/MyCourses";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Social from "./pages/Social";
import Account from "./pages/Account";
import Media from "./pages/Media";
import MediaPlaylist from "./pages/MediaPlaylist";

import GroupDetail from "./pages/GroupDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import Membership from "./pages/Membership";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, emailVerified, loading } = useAuth();

  if (loading || (user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!emailVerified) {
    return <Navigate to="/auth?mode=login&unverified=true" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, emailVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user && emailVerified) {
    return <Navigate to="/courses" replace />;
  }

  return <>{children}</>;
}

// Wrapper to add bottom padding when player is visible
function AppContent() {
  return (
    <>
      <ScrollToTop />
      <div className="pb-24">
      <Routes>
        <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/left-brain-settings" element={<ProtectedRoute><LeftBrainSettings /></ProtectedRoute>} />
        <Route path="/shared" element={<ProtectedRoute><SharedWithMe /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:courseId" element={<CourseLanding />} />
        <Route path="/courses/:courseId/learn" element={<ProtectedRoute><Course /></ProtectedRoute>} />
        <Route path="/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout/:productId?" element={<Checkout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* Community is publicly viewable */}
        <Route path="/community" element={<Social />} />
        <Route path="/community/groups/:groupId" element={<GroupDetail />} />
        <Route path="/friends" element={<Navigate to="/community?tab=friends" replace />} />

        {/* Profiles: public profiles at /profile/:userId, own profile at /profile (requires login) */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<Profile />} />

        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/tech-spec/:token" element={<SharedTechSpec />} />
        <Route path="/media" element={<Media />} />
        <Route path="/media/playlist/:playlistId" element={<MediaPlaylist />} />
        <Route path="/membership" element={<Membership />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatPopup />
      <StickyAudioPlayer />
      </div>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GeoPricingProvider>
      <AuthProvider>
        <CartProvider>
          <MessagingProvider>
            <MediaPlayerProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </MediaPlayerProvider>
          </MessagingProvider>
        </CartProvider>
      </AuthProvider>
    </GeoPricingProvider>
  </QueryClientProvider>
);

export default App;
