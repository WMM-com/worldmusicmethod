import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, Package, Image, Shield, FolderOpen, Upload, FileText, Mail, Flag, DollarSign, Music, Tag, Menu, LayoutGrid, FileCode, Wallet, PenLine, MessageSquare } from 'lucide-react';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminCourses } from '@/components/admin/AdminCourses';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { AdminMedia } from '@/components/admin/AdminMedia';
import { AdminStreaming } from '@/components/admin/AdminStreaming';
import { AdminCourseGroups } from '@/components/admin/AdminCourseGroups';
import { ImportCourseData } from '@/components/admin/ImportCourseData';
import { LandingPageEditor } from '@/components/admin/LandingPageEditor';
import { AdminEmailCRM } from '@/components/admin/AdminEmailCRM';
import { AdminReports } from '@/components/admin/AdminReports';
import { AdminSales } from '@/components/admin/AdminSales';
import { AdminCoupons } from '@/components/admin/AdminCoupons';
import { AdminMenuEditor } from '@/components/admin/AdminMenuEditor';
import { AdminPages } from '@/components/admin/AdminPages';
import { AdminFinances } from '@/components/admin/AdminFinances';
import { AdminReviews } from '@/components/admin/AdminReviews';
import { AdminBlog } from '@/components/admin/blog/AdminBlog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuItems = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'media', label: 'Media Library', icon: Image },
  { id: 'streaming', label: 'Streaming', icon: Music },
  { id: 'groups', label: 'Course Groups', icon: FolderOpen },
  { id: 'blog', label: 'Blog', icon: PenLine },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'pages', label: 'Pages', icon: FileCode },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'landing', label: 'Landing Pages', icon: FileText },
  { id: 'email-crm', label: 'Email CRM', icon: Mail },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'menu-editor', label: 'Menu Editor', icon: LayoutGrid },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    enrollments: 0,
    products: 0,
  });

  useEffect(() => {
    async function checkAdminAndLoadStats() {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);

      // Load stats
      const [usersRes, coursesRes, enrollmentsRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count || 0,
        courses: coursesRes.count || 0,
        enrollments: enrollmentsRes.count || 0,
        products: productsRes.count || 0,
      });
    }

    checkAdminAndLoadStats();
  }, [user, navigate]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <AdminUsers />;
      case 'courses': return <AdminCourses />;
      case 'products': return <AdminProducts />;
      case 'sales': return <AdminSales />;
      case 'finances': return <AdminFinances />;
      case 'coupons': return <AdminCoupons />;
      case 'media': return <AdminMedia />;
      case 'streaming': return <AdminStreaming />;
      case 'groups': return <AdminCourseGroups />;
      case 'blog': return <AdminBlog />;
      case 'reviews': return <AdminReviews />;
      case 'pages': return <AdminPages />;
      case 'import': return <ImportCourseData />;
      case 'landing': return <LandingPageEditor />;
      case 'email-crm': return <AdminEmailCRM />;
      case 'reports': return <AdminReports />;
      case 'menu-editor': return <AdminMenuEditor />;
      default: return <AdminUsers />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Admin</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-10',
              activeTab === item.id && 'bg-muted text-primary font-medium'
            )}
            onClick={() => handleTabChange(item.id)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );

  if (isAdmin === null) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background p-6">
          <div className="w-full max-w-6xl mx-auto px-6">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access the admin dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <SiteHeader />
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-56 flex-col flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header */}
          <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* Mobile menu trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-56 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold capitalize truncate">{menuItems.find(m => m.id === activeTab)?.label || 'Admin'}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Manage users, courses, and products</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
            {/* Stats - only show on users tab */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.users}</p>
                        <p className="text-sm text-muted-foreground">Users</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.courses}</p>
                        <p className="text-sm text-muted-foreground">Courses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.enrollments}</p>
                        <p className="text-sm text-muted-foreground">Enrollments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.products}</p>
                        <p className="text-sm text-muted-foreground">Products</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab Content */}
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
