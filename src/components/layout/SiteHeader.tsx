import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, LogOut, User, Settings, Menu, X, Shield, ShoppingCart, ChevronDown, Users, Brain, Home, Calendar, Music, Video, FileText, MessageSquare, Bell, Heart, Star, Folder, Image, Mail, Phone, MapPin, BarChart3 } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MessagesDropdown } from '@/components/messaging/MessagesDropdown';
import { useQuery } from '@tanstack/react-query';
import wmmLogo from '@/assets/wmm-logo.png';

// Icon mapping for menu items
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen, Users, Brain, User, Settings, Shield, Home, Calendar, Music, Video, 
  FileText, MessageSquare, Bell, Heart, Star, Folder, Image, Mail, Phone, MapPin, BarChart3
};

interface MenuItem {
  id: string;
  menu_type: 'desktop' | 'mobile' | 'profile';
  label: string;
  href: string | null;
  icon: string | null;
  parent_id: string | null;
  order_index: number;
  is_visible: boolean;
  requires_auth: boolean;
  requires_admin: boolean;
}

export function SiteHeader({ rightAddon }: { rightAddon?: ReactNode }) {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { getItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const cartItemCount = getItemCount();

  // Fetch menu items from database
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_visible', true)
        .order('order_index');
      if (error) throw error;
      return (data || []) as MenuItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check artist dashboard access
  const { data: hasArtistDashboardAccess = false } = useQuery({
    queryKey: ['artist-dashboard-access-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('artist_dashboard_access')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      if (error) return false;
      return (data?.length || 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    async function checkAdminAccess() {
      if (!user) {
        setHasAdminAccess(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      
      setHasAdminAccess(data && data.length > 0);
    }
    
    checkAdminAccess();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Filter menu items by type and auth requirements
  const filterMenuItems = (type: 'desktop' | 'mobile' | 'profile', parentId: string | null = null) => {
    return menuItems
      .filter(item => {
        if (item.menu_type !== type) return false;
        if (item.parent_id !== parentId) return false;
        if (item.requires_auth && !user) return false;
        if (item.requires_admin && !hasAdminAccess) return false;
        return true;
      })
      .sort((a, b) => a.order_index - b.order_index);
  };

  const desktopItems = filterMenuItems('desktop');
  const mobileItems = filterMenuItems('mobile');
  const profileItems = filterMenuItems('profile');

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    return ICON_MAP[iconName] || null;
  };

  const renderDesktopNavItem = (item: MenuItem) => {
    const children = filterMenuItems('desktop', item.id);

    if (children.length > 0) {
      // Render as dropdown
      return (
        <DropdownMenu key={item.id}>
          <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {item.label}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {children.map((child) => (
              <DropdownMenuItem key={child.id} onClick={() => child.href && navigate(child.href)}>
                {child.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Render as link
    return (
      <Link
        key={item.id}
        to={item.href || '#'}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {item.label}
      </Link>
    );
  };

  const renderMobileNavItem = (item: MenuItem) => {
    const children = filterMenuItems('mobile', item.id);
    const IconComponent = getIcon(item.icon);

    if (children.length > 0) {
      // Render as section with children
      return (
        <div key={item.id} className="px-2 py-2">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            {IconComponent && <IconComponent className="h-4 w-4" />}
            {item.label}
          </span>
          <div className="mt-2 ml-2 flex flex-col gap-1">
            {children.map((child) => {
              const ChildIcon = getIcon(child.icon);
              return (
                <Link
                  key={child.id}
                  to={child.href || '#'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  {ChildIcon && <ChildIcon className="h-4 w-4" />}
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    // Render as link
    return (
      <Link
        key={item.id}
        to={item.href || '#'}
        onClick={() => setMobileMenuOpen(false)}
        className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={wmmLogo} 
              alt="World Music Method" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {desktopItems.map(item => renderDesktopNavItem(item))}
          </nav>

          {/* Right side - Auth buttons or User menu */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
              {/* Cart button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/cart')}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Button>
              <MessagesDropdown />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'User'} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-secondary">
                          {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2 p-2">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'User'} 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
                        <span className="text-xs font-medium text-secondary">
                          {profile?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {/* Artist Dashboard - only shown for users with access */}
                  {hasArtistDashboardAccess && (
                    <DropdownMenuItem onClick={() => navigate('/artist-dashboard')}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Artist Dashboard
                    </DropdownMenuItem>
                  )}
                  {/* Join Meeting - for all authenticated users */}
                  <DropdownMenuItem onClick={() => navigate('/meet')}>
                    <Video className="mr-2 h-4 w-4" />
                    Join Meeting
                  </DropdownMenuItem>
                  {profileItems.map((item) => {
                    const IconComponent = getIcon(item.icon);
                    // Insert separator before admin items
                    const showSeparator = item.requires_admin && profileItems.findIndex(p => p.id === item.id) > 0;
                    return (
                      <div key={item.id}>
                        {showSeparator && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => item.href && navigate(item.href)}>
                          {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                          {item.label}
                        </DropdownMenuItem>
                      </div>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : !loading ? (
              <>
                {/* Cart button for non-logged in users */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/cart')}
                  className="relative"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => navigate('/auth?mode=login')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')} className="gradient-primary">
                  Sign Up
                </Button>
              </>
            ) : null}
            {rightAddon ? <div className="ml-2 flex items-center">{rightAddon}</div> : null}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              {mobileItems.map(item => renderMobileNavItem(item))}
              
              {user ? (
                <>
                  {hasArtistDashboardAccess && (
                    <Link
                      to="/artist-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Artist Dashboard
                    </Link>
                  )}
                  {hasAdminAccess && (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                  <Link
                    to="/meet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Join Meeting
                  </Link>
                  <Button
                    variant="ghost"
                    className="justify-start px-2"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : !loading ? (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/auth?mode=login')}>
                    Login
                  </Button>
                  <Button className="flex-1 gradient-primary" onClick={() => navigate('/auth?mode=signup')}>
                    Sign Up
                  </Button>
                </div>
              ) : null}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}