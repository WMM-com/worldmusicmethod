import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Music,
  Users,
  Award,
  Headphones,
  ShoppingCart,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useCourse } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CourseLanding() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useCourse(courseId);
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Show sticky CTA when scrolled past hero
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.7; // 70vh hero
      setShowStickyCTA(scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch product for this course
  const { data: product } = useQuery({
    queryKey: ['course-product', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Check if user is enrolled
  const { data: isEnrolled } = useQuery({
    queryKey: ['user-enrollment', courseId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', courseId!)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!courseId && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-[60vh] w-full" />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Skeleton className="h-8 w-96 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
  const totalDuration = course.modules?.reduce((acc, m) => 
    acc + (m.lessons?.reduce((a, l) => a + (l.duration_seconds || 0), 0) || 0), 0) || 0;

  const priceInfo = product ? calculatePrice(product.base_price_usd) : null;

  const handleStartCourse = () => {
    if (isEnrolled) {
      navigate(`/courses/${courseId}/learn`);
    } else if (product) {
      navigate(`/checkout/${product.id}`);
    } else if (!user) {
      navigate('/auth');
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10">
          {course.cover_image_url && (
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url(${course.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                Guitar
              </span>
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                {course.country}
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {course.title}
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              {course.description || `From Huayño to the Peruvian Waltz, immerse yourself in Andean culture and develop new guitar talents.`}
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Button size="lg" onClick={handleStartCourse} className="gap-2">
                {isEnrolled ? (
                  <>
                    <Play className="w-5 h-5" />
                    Continue Learning
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {priceInfo ? `Enroll for ${formatPrice(priceInfo.price, priceInfo.currency)}` : 'Enroll Now'}
                  </>
                )}
              </Button>
              {priceInfo && priceInfo.discount_percentage > 0 && !isEnrolled && (
                <Badge variant="secondary" className="self-center">
                  {priceInfo.discount_percentage}% off in your region
                </Badge>
              )}
            </div>

            {/* Course stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{course.modules?.length || 0} Modules</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <span>{totalLessons} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{Math.round(totalDuration / 60)} min</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Course card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <Card className="p-6 bg-card/80 backdrop-blur border-border/50">
              {course.cover_image_url ? (
                <img 
                  src={course.cover_image_url} 
                  alt={course.title}
                  className="w-full aspect-video object-cover rounded-lg mb-6"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-6 flex items-center justify-center">
                  <Music className="w-16 h-16 text-primary/30" />
                </div>
              )}

              <h3 className="font-semibold mb-4">Course Includes</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {course.modules?.length || 0} Modules
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Play className="w-4 h-4 text-primary" />
                  {totalLessons} Video Lessons
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Lifetime Access
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  Student Community
                </li>
              </ul>

              {priceInfo && !isEnrolled && (
                <div className="mb-4 text-center">
                  <p className="text-2xl font-bold">
                    {formatPrice(priceInfo.price, priceInfo.currency)}
                  </p>
                  {priceInfo.discount_percentage > 0 && (
                    <p className="text-sm text-muted-foreground line-through">
                      ${product?.base_price_usd?.toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    30-day 110% money-back guarantee
                  </p>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleStartCourse}>
                {isEnrolled ? 'Continue Learning' : (priceInfo ? 'Enroll Now' : 'Get Started')}
              </Button>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-6">Could Your Guitar Sound More Melodic?</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                Most guitarists think in terms of rhythm and lead, chords and melody – but true mastery 
                comes from blending them into one seamless voice. The best players don't just play the 
                notes; they make the instrument sing.
              </p>
              <p>
                In Peru, music is a conversation, between past and present, the instruments, between 
                the dancer and the rhythm. Huayño's soaring melodies climb and tumble like the Andean 
                landscape, Peruvian waltz flows with elegance before twisting into unexpected syncopation, 
                and Festejo surges forward with the fiery pulse of Afro-Peruvian percussion.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Learning Outcomes */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Key Learning Outcomes</h2>
            <p className="text-muted-foreground">By the end of this course, you will be able to:</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Music,
                title: 'Master Essential Peruvian Guitar Styles',
                items: [
                  'Develop an authentic feel for Huayño, Carnavalito, Waltz, Festejo, and Landó',
                  'Learn strumming and fingerstyle techniques specific to each genre'
                ]
              },
              {
                icon: Award,
                title: 'Enhance Your Technical & Musical Skills',
                items: [
                  'Build precision in syncopated rhythms and dynamic phrasing',
                  'Combine chord-melody playing with intricate bass movements'
                ]
              },
              {
                icon: Headphones,
                title: 'Deepen Your Understanding of Peruvian Music',
                items: [
                  'Explore the historical and cultural significance behind each style',
                  "Understand the guitar's role in Andean, Creole, and Afro-Peruvian traditions"
                ]
              },
              {
                icon: CheckCircle,
                title: 'Play With Authenticity and Confidence',
                items: [
                  'Learn directly from a specialist in Latin American folk guitar',
                  'Develop a versatile repertoire suited for both solo and ensemble performance'
                ]
              }
            ].map((outcome, i) => (
              <motion.div
                key={outcome.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                      <outcome.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">{outcome.title}</h3>
                      <ul className="space-y-2">
                        {outcome.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Course Content</h2>
            <p className="text-muted-foreground">
              {course.modules?.length || 0} modules • {totalLessons} lessons • {Math.round(totalDuration / 60)} minutes
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {course.modules?.map((module, i) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <AccordionItem value={module.id} className="border rounded-lg bg-card px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <span className="font-bold text-primary">{i + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{module.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {module.lessons?.length || 0} lessons
                          {module.estimated_duration && ` • ${module.estimated_duration} min`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-14 space-y-2">
                      {module.lessons?.map((lesson, j) => (
                        <div 
                          key={lesson.id}
                          className="flex items-center gap-3 py-2 text-sm"
                        >
                          <Play className="w-4 h-4 text-muted-foreground" />
                          <span>{lesson.title}</span>
                          {lesson.duration_seconds && (
                            <span className="text-muted-foreground ml-auto">
                              {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join students from around the world learning authentic Peruvian guitar styles.
            </p>
            <Button size="lg" onClick={handleStartCourse} className="gap-2">
              <Play className="w-5 h-5" />
              {user ? 'Continue Learning' : 'Enroll Now'}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>

    {/* Sticky CTA - appears when scrolled past hero */}
    <AnimatePresence>
      {showStickyCTA && priceInfo && !isEnrolled && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border shadow-lg"
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:block">
                <p className="text-lg font-bold">
                  {formatPrice(priceInfo.price, priceInfo.currency)}
                </p>
                {priceInfo.discount_percentage > 0 && (
                  <p className="text-xs text-muted-foreground line-through">
                    ${product?.base_price_usd?.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">30-day 110% money-back</span>
              </div>
            </div>
            <Button 
              size="default" 
              onClick={handleStartCourse} 
              className="gap-2 shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">
                {priceInfo ? `Enroll for ${formatPrice(priceInfo.price, priceInfo.currency)}` : 'Enroll Now'}
              </span>
              <span className="sm:hidden">
                {priceInfo ? formatPrice(priceInfo.price, priceInfo.currency) : 'Enroll'}
              </span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}