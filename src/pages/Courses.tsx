import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CoursePortalTransition } from '@/components/courses/CoursePortalTransition';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useGeoPricing, formatPrice } from '@/contexts/GeoPricingContext';
import { supabase } from '@/integrations/supabase/client';

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: courses, isLoading } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const { calculatePrice, isLoading: priceLoading } = useGeoPricing();

  // Fetch products for courses to get prices
  const { data: products } = useQuery({
    queryKey: ['course-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, course_id, base_price_usd, sale_price_usd, is_active')
        .eq('is_active', true)
        .not('course_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all product regional pricing for courses
  const { data: allRegionalPricing } = useQuery({
    queryKey: ['all-product-regional-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_regional_pricing')
        .select('product_id, region, discount_percentage, currency, fixed_price');
      if (error) throw error;
      return data || [];
    },
  });

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return data === true;
    },
    enabled: !!user,
  });

  // Filter courses by search query (title, country, description, tags, tutor)
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!searchQuery.trim()) return courses;
    
    const query = searchQuery.toLowerCase();
    return courses.filter(course => 
      course.title.toLowerCase().includes(query) ||
      course.country?.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query) ||
      course.tutor_name?.toLowerCase().includes(query) ||
      (course.tags as string[] || []).some(tag => tag.toLowerCase().includes(query))
    );
  }, [courses, searchQuery]);

  // Get price for a course - returns null if still loading geo data
  const getCoursePrice = (courseId: string) => {
    if (priceLoading) return null;
    const product = products?.find(p => p.course_id === courseId);
    if (!product) return null;
    const basePrice = product.sale_price_usd || product.base_price_usd;
    // Get product-specific regional pricing
    const productRegionalPricing = allRegionalPricing?.filter(p => p.product_id === product.id) || [];
    return calculatePrice(basePrice, productRegionalPricing);
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </div>
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">World Music Method</h1>
              <p className="text-muted-foreground">
                Master Your Instrument, Develop Musical Freedom
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => navigate('/courses/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            )}
          </div>
          
          {/* Search bar */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, tutors, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Course grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {filteredCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, i) => {
              const priceInfo = getCoursePrice(course.id);
              
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CoursePortalTransition 
                    courseId={course.id} 
                    imageUrl={course.cover_image_url || undefined}
                  >
                    <Card
                      className="group overflow-hidden hover:shadow-xl transition-all duration-300"
                    >
                      {/* Cover image */}
                      <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-primary/30" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        
                        {/* Tutor name */}
                        {course.tutor_name && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {course.tutor_name}
                          </p>
                        )}
                        
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {course.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              Course
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Price in yellow - only show when geo detection complete */}
                            {!priceLoading && priceInfo && (
                              <span className="font-bold text-yellow-500">
                                {formatPrice(priceInfo.price, priceInfo.currency)}
                              </span>
                            )}
                            {priceLoading && priceInfo && (
                              <span className="font-bold text-yellow-500 animate-pulse">...</span>
                            )}
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </CoursePortalTransition>
                </motion.div>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No courses found</h2>
            <p className="text-muted-foreground mb-6">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first course to get started
            </p>
            {isAdmin && (
              <Button onClick={() => navigate('/courses/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            )}
          </div>
        )}
      </main>
      </div>
    </>
  );
}
