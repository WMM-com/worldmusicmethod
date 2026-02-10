import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Brain, Calendar, FileText, PieChart, Settings, LogOut, Menu, X, Receipt, FolderOpen, Music, Video, Store, GraduationCap, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { SiteHeader } from './SiteHeader';

// Section guides for Left Brain features
const sectionGuides: Record<string, string> = {
  '/left-brain': 'Your financial overview showing earnings, expenses, and upcoming events at a glance.',
  '/events': 'Manage your gigs, rehearsals, and sessions. Track dates, venues, and payments.',
  '/invoices': 'Create and send professional invoices to clients. Track payment status.',
  '/expenses': 'Log business expenses and keep receipts organized for tax time.',
  '/finances': 'Detailed breakdown of your income and expenses with tax estimates.',
  '/documents': 'Upload and store documents to share with venues, tour managers, or bandmates.',
  '/tech-specs': 'Create visual stage plots and channel lists to share with venues and sound engineers.',
  '/merchandise': 'Manage your merch catalogue, track inventory, and record sales from gigs and online.',
  '/left-brain-settings': 'Customize your Left Brain experience, invoice templates, and preferences.',
  '/lessons': 'Browse available private lessons and manage your bookings with expert tutors.',
  '/tutor-dashboard': 'Manage your lesson offerings, availability schedule, and incoming booking requests.',
  '/tutor/rooms': 'Create and manage video rooms for your private tutoring sessions.',
};

// Main navigation items
const mainNavItems = [
  { href: '/left-brain', label: 'Dashboard', icon: PieChart },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/finances', label: 'Finances', icon: PieChart },
  { href: '/merchandise', label: 'Merchandise', icon: Store },
];

// Documents section
const documentNavItems = [
  { href: '/documents', label: 'Documents', icon: FolderOpen },
];

// Tech Specs section  
const techSpecNavItems = [
  { href: '/tech-specs', label: 'Tech Specs', icon: Music },
];

// Tutor section
const tutorNavItems = [
  { href: '/lessons', label: 'Private Lessons', icon: GraduationCap },
  { href: '/tutor-dashboard', label: 'Tutor Dashboard', icon: ClipboardList },
  { href: '/tutor/rooms', label: 'Tutor Rooms', icon: Video },
];

// Settings
const settingsNavItems = [
  { href: '/left-brain-settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const { signOut, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get the guide for the current section
  const currentGuide = sectionGuides[pathname] || '';
  
  // Check if current path matches (including query params for tabs)
  const isActive = (href: string) => {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      return pathname === path && search.includes(query.split('=')[1]);
    }
    return pathname === href;
  };

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2',
          active
            ? 'text-secondary border-secondary bg-card'
            : 'text-sidebar-foreground hover:text-secondary hover:bg-card border-transparent'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };

  const renderMobileNavItem = (item: typeof mainNavItems[0]) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border-l-2',
          active
            ? 'text-secondary border-secondary bg-card'
            : 'text-muted-foreground hover:text-secondary hover:bg-card border-transparent'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Site Header for navigation back to main site */}
      <SiteHeader />
      
      <div className="flex flex-1 min-h-0">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col flex-shrink-0 border-r border-border bg-sidebar overflow-y-auto">
        <div className="flex h-14 items-center gap-2 px-6 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-secondary/80">
            <Brain className="h-4 w-4 text-secondary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground">Left Brain</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Main Section */}
          <div className="space-y-1">
            {mainNavItems.map(renderNavItem)}
          </div>
          
          {/* Documents Section */}
          <div className="pt-2">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
            <div className="space-y-1">
              {documentNavItems.map(renderNavItem)}
            </div>
          </div>
          
          {/* Tech Specs Section */}
          <div className="pt-2">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage & Tech</p>
            <div className="space-y-1">
              {techSpecNavItems.map(renderNavItem)}
            </div>
          </div>
          
          {/* Tutor Section */}
          <div className="pt-2">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutor</p>
            <div className="space-y-1">
              {tutorNavItems.map(renderNavItem)}
            </div>
          </div>
          
          {/* Settings Section */}
          <div className="pt-2">
            <div className="space-y-1">
              {settingsNavItems.map(renderNavItem)}
            </div>
          </div>
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-secondary/80">
              <Brain className="h-4 w-4 text-secondary-foreground" />
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
        <div className="lg:hidden fixed inset-0 top-[7.5rem] bg-background z-30 overflow-y-auto">
          <nav className="p-4 space-y-4">
            {/* Main Section */}
            <div className="space-y-1">
              {mainNavItems.map(renderMobileNavItem)}
            </div>
            
            {/* Documents Section */}
            <div className="pt-2">
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
              <div className="space-y-1">
                {documentNavItems.map(renderMobileNavItem)}
              </div>
            </div>
            
            {/* Tech Specs Section */}
            <div className="pt-2">
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage & Tech</p>
              <div className="space-y-1">
                {techSpecNavItems.map(renderMobileNavItem)}
              </div>
            </div>
            
            {/* Tutor Section */}
            <div className="pt-2">
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutor</p>
              <div className="space-y-1">
                {tutorNavItems.map(renderMobileNavItem)}
              </div>
            </div>
            
            {/* Settings Section */}
            <div className="pt-2">
              <div className="space-y-1">
                {settingsNavItems.map(renderMobileNavItem)}
              </div>
            </div>
            
            <Button variant="ghost" className="w-full justify-start mt-4 text-muted-foreground hover:text-secondary" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="pt-14 lg:pt-0">
          {/* Section Guide */}
          {currentGuide && (
            <div className="hidden lg:block px-6 lg:px-8 pt-6">
              <div className="bg-card/50 border border-border rounded-lg px-4 py-3">
                <p className="text-sm text-muted-foreground">{currentGuide}</p>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
      </div>
    </div>
  );
}
