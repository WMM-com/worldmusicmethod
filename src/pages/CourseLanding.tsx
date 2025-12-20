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
  Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useCourse } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Resource item type
interface ResourceItem {
  image: string;
  title: string;
  description: string;
}

// Course-specific content configuration
const COURSE_CONFIG: Record<string, {
  heroBackground: string;
  courseImage: string;
  trailerVideo: string;
  stylesImageDesktop: string;
  stylesImageMobile: string;
  expert?: {
    name: string;
    image: string;
    bio: string[];
  };
  resources?: ResourceItem[];
}> = {
  // Peruvian Guitar Styles course config
  'peruvian-guitar-styles': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/05/Peruvian-Guitar-2-1.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/04/Peruvian-Guitar-1.jpg',
    trailerVideo: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Argentinian-Guitar-Trailer.mp4',
    stylesImageDesktop: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-7.png',
    stylesImageMobile: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-6.png',
    expert: {
      name: 'Camilo Menjura',
      image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/05/Camilo-Menjura.jpg',
      bio: [
        "Born in Bogotá, Camilo Menjura is a guitarist, arranger, and composer recognized for his deep mastery of Latin American folk music. His journey began by learning Colombian folk styles by ear before formally studying classical guitar at one of Colombia's top music academies.",
        "Camilo's expertise extends across multiple traditions, from Andean, Cuban, and Brazilian folk to intricate classical and jazz arrangements. His rare ability to translate complex multi-instrumental textures into rich solo guitar performances has made him a sought-after performer and educator.",
        "Twice awarded UK Latin Musician of the Year, Camilo has performed at WOMAD, The Mali Festival of the Desert, and international music festivals worldwide. As the leader of London's World Music Choir, his work celebrates the global power of music.",
        "In this course, Camilo shares not just technique, but the deep cultural essence and emotion that define Peruvian guitar."
      ]
    },
    resources: [
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-4.png',
        title: 'Peruvian Guitar Styles',
        description: "60 minutes of detailed lessons teaching you to be proficient in some of Peru's popular and folkloric genres including Wayñu, Carnavalito and Waltz."
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-2.png',
        title: 'Interactive On-screen Notation',
        description: 'Learning new skills is easier with our innovative, interactive tools. Access on-screen notation, tablature, slow motion and more.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-5.png',
        title: 'Landó Masterclass',
        description: 'Take your study further with a 1 hour masterclass in the guitar styles played within the popular Afro-Peruvian style Landó.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-1.png',
        title: 'Festejo Masterclass',
        description: "Camilo Menjura's Festejo masterclass will take you deeper into understanding this coastal genre known for accompanying one of Peru's famed dance styles."
      }
    ]
  }
};

// Helper to get config by course title/slug
const getCourseConfig = (courseTitle?: string) => {
  if (!courseTitle) return null;
  const slug = courseTitle.toLowerCase().replace(/\s+/g, '-');
  return COURSE_CONFIG[slug] || null;
};

export default function CourseLanding() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useCourse(courseId);
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Get course-specific config
  const courseConfig = getCourseConfig(course?.title);

  // Show sticky CTA when scrolled past hero
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyCTA(scrollY > 300);
    };

    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
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
          {/* Background Image */}
          <div className="absolute inset-0">
            {courseConfig?.heroBackground ? (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${courseConfig.heroBackground})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            ) : course.cover_image_url && (
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url(${course.cover_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}
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

            {/* Right: Course card with video play */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <Card className="p-6 bg-card/80 backdrop-blur border-border/50">
                {/* Course image with play button overlay */}
                <div 
                  className="relative w-full aspect-video rounded-lg mb-6 overflow-hidden cursor-pointer group"
                  onClick={() => courseConfig?.trailerVideo && setShowVideoModal(true)}
                >
                  {courseConfig?.courseImage || course.cover_image_url ? (
                    <img 
                      src={courseConfig?.courseImage || course.cover_image_url} 
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Music className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  
                  {/* Play button overlay */}
                  {courseConfig?.trailerVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-primary fill-primary ml-1" />
                      </div>
                    </div>
                  )}
                </div>

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

        {/* Description Section with Tabs for Content/Expert */}
        <section className="py-16 bg-background">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Tabs defaultValue="course" className="w-full">
                <TabsList className="mb-8">
                  <TabsTrigger value="course">Course Overview</TabsTrigger>
                  {courseConfig?.expert && (
                    <TabsTrigger value="expert">Meet Your Expert</TabsTrigger>
                  )}
                  {courseConfig?.resources && (
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="course">
                  <div className="w-full">
                    <h2 className="text-3xl font-bold mb-6 text-center">Could Your Guitar Sound More Melodic?</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
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
                  </div>

                  {/* Responsive styles image */}
                  {courseConfig && (
                    <div className="mt-8">
                      {/* Desktop/Tablet image */}
                      <img 
                        src={courseConfig.stylesImageDesktop}
                        alt="Peruvian Guitar Styles"
                        className="hidden md:block w-full h-auto rounded-lg"
                      />
                      {/* Mobile image */}
                      <img 
                        src={courseConfig.stylesImageMobile}
                        alt="Peruvian Guitar Styles"
                        className="md:hidden w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                </TabsContent>

                {courseConfig?.expert && (
                  <TabsContent value="expert">
                    <div className="grid md:grid-cols-3 gap-8 items-start">
                      <div className="md:col-span-1">
                        <img 
                          src={courseConfig.expert.image}
                          alt={courseConfig.expert.name}
                          className="w-full aspect-[3/4] object-cover rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <h2 className="text-3xl font-bold mb-2">Meet Your Expert</h2>
                        <h3 className="text-xl text-primary mb-6">{courseConfig.expert.name}</h3>
                        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
                          {courseConfig.expert.bio.map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {courseConfig?.resources && (
                  <TabsContent value="resources">
                    <h2 className="text-3xl font-bold mb-8 text-center">The Ultimate Learning Experience</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      {courseConfig.resources.map((resource, i) => (
                        <div key={i} className="flex gap-6 items-start">
                          <img 
                            src={resource.image}
                            alt={resource.title}
                            className="w-32 h-32 object-cover rounded-lg shrink-0"
                          />
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                            <p className="text-muted-foreground">{resource.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </motion.div>
          </div>
        </section>

        {/* Learning Outcomes */}
        <section className="py-16 bg-background">
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
        <section className="py-16 bg-background">
          <div className="max-w-6xl mx-auto px-6">
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

            <div className="max-w-4xl mx-auto">
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-background">
          <div className="max-w-6xl mx-auto px-6 text-center">
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

      {/* Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none">
          <button
            onClick={() => setShowVideoModal(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {courseConfig?.trailerVideo && showVideoModal && (
            <video 
              src={courseConfig.trailerVideo}
              controls
              autoPlay
              className="w-full aspect-video"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Sticky CTA - appears when scrolled past hero */}
      <AnimatePresence>
        {showStickyCTA && !isEnrolled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border shadow-lg"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {priceInfo && (
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
                )}
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
