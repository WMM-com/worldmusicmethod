import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Brain, Calendar, FileText, PieChart, Settings, LogOut, Menu, X, Users, Receipt, FolderOpen, Home } from 'lucide-react';
import { useState } from 'react';
import { SiteHeader } from './SiteHeader';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: PieChart },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/shared', label: 'Shared With Me', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/finances', label: 'Finances', icon: PieChart },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/left-brain-settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Site Header for navigation back to main site */}
      <SiteHeader />
      
      <div className="flex flex-1">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-6 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground">Left Brain</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2',
                  isActive
                    ? 'text-secondary border-secondary bg-card'
                    : 'text-sidebar-foreground hover:text-secondary hover:bg-card border-transparent'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-secondary">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-secondary" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Header - now below site header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 h-14 bg-background/80 backdrop-blur-lg border-b border-border z-40">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">Left Brain</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[7.5rem] bg-background z-30">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border-l-2',
                    isActive
                      ? 'text-secondary border-secondary bg-card'
                      : 'text-muted-foreground hover:text-secondary hover:bg-card border-transparent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="ghost" className="w-full justify-start mt-4 text-muted-foreground hover:text-secondary" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
      </div>
    </div>
  );
}
