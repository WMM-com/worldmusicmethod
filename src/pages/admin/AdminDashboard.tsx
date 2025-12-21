import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, Package, Image, Shield, FolderOpen, Upload, FileText, Mail } from 'lucide-react';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminCourses } from '@/components/admin/AdminCourses';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { AdminMedia } from '@/components/admin/AdminMedia';
import { AdminCourseGroups } from '@/components/admin/AdminCourseGroups';
import { ImportCourseData } from '@/components/admin/ImportCourseData';
import { LandingPageEditor } from '@/components/admin/LandingPageEditor';
import { AdminEmailCRM } from '@/components/admin/AdminEmailCRM';
import { Skeleton } from '@/components/ui/skeleton';
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="w-full max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage users, courses, and products</p>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-success" />
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
                    <Package className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.products}</p>
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <Image className="h-4 w-4" />
                Media
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Course Groups
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="h-4 w-4" />
                Import
              </TabsTrigger>
              <TabsTrigger value="landing" className="gap-2">
                <FileText className="h-4 w-4" />
                Landing Pages
              </TabsTrigger>
              <TabsTrigger value="email-crm" className="gap-2">
                <Mail className="h-4 w-4" />
                Email CRM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <AdminUsers />
            </TabsContent>
            <TabsContent value="courses">
              <AdminCourses />
            </TabsContent>
            <TabsContent value="products">
              <AdminProducts />
            </TabsContent>
            <TabsContent value="media">
              <AdminMedia />
            </TabsContent>
            <TabsContent value="groups">
              <AdminCourseGroups />
            </TabsContent>
            <TabsContent value="import">
              <ImportCourseData />
            </TabsContent>
            <TabsContent value="landing">
              <LandingPageEditor />
            </TabsContent>
            <TabsContent value="email-crm">
              <AdminEmailCRM />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
