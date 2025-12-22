import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { ChatPopup } from "@/components/messaging/ChatPopup";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Invoices from "./pages/Invoices";
import Finances from "./pages/Finances";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import SharedWithMe from "./pages/SharedWithMe";
import IncomeProof from "./pages/IncomeProof";
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
import GroupDetail from "./pages/GroupDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/courses" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <MessagingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<Navigate to="/courses" replace />} />
                <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><Social /></ProtectedRoute>} />
                <Route path="/community/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/profile/:userId?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/tech-spec/:token" element={<SharedTechSpec />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatPopup />
            </BrowserRouter>
          </TooltipProvider>
        </MessagingProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
