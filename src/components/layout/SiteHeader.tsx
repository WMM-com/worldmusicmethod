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
import { BookOpen, LogOut, User, Settings, Menu, X, Shield, MessageSquare, ShoppingCart, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import siteLogo from '@/assets/world-music-method-logo.png';

export function SiteHeader() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { getItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const cartItemCount = getItemCount();

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    }
    
    checkAdminRole();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const learningHubLinks = [
    { href: '/courses', label: 'Courses' },
    { href: '/my-courses', label: 'My Courses' },
  ];

  const navLinks = [
    { href: '/community', label: 'Community' },
    { href: '/', label: 'Left Brain' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={siteLogo} 
              alt="World Music Method" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Learning Hub Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Learning Hub
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {learningHubLinks.map((link) => (
                  <DropdownMenuItem key={link.href} onClick={() => navigate(link.href)}>
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
              <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
                <MessageSquare className="h-5 w-5" />
              </Button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-secondary">
                        {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2 p-2">
                    <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-secondary">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-courses')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    My Courses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
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
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/auth')} className="gradient-primary">
                  Sign Up
                </Button>
              </>
            )}
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
              {/* Learning Hub Section */}
              <div className="px-2 py-2">
                <span className="text-sm font-semibold text-foreground">Learning Hub</span>
                <div className="mt-2 ml-2 flex flex-col gap-1">
                  {learningHubLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  )}
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
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/auth')}>
                    Login
                  </Button>
                  <Button className="flex-1 gradient-primary" onClick={() => navigate('/auth')}>
                    Sign Up
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
