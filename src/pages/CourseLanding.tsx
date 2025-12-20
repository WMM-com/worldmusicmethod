import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  ChevronLeft,
  Music,
  Users,
  Award,
  Headphones,
  ShoppingCart,
  Shield,
  X,
  FileText,
  HelpCircle,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useCourse } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Resource item type
interface ResourceItem {
  image: string;
  title: string;
  description: string;
}

// FAQ item type
interface FAQItem {
  question: string;
  answer: string;
}

// Course-specific content configuration
const COURSE_CONFIG: Record<string, {
  heroBackground: string;
  courseImage: string;
  trailerVideo: string;
  stylesImageDesktop: string;
  stylesImageMobile: string;
  courseOverview: string[];
  expert?: {
    name: string;
    image: string;
    bio: string[];
  };
  resources?: ResourceItem[];
  courseIncludes?: string[];
  faqs?: FAQItem[];
}> = {
  // Peruvian Guitar Styles course config
  'peruvian-guitar-styles': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/05/Peruvian-Guitar-2-1.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/04/Peruvian-Guitar-1.jpg',
    trailerVideo: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Argentinian-Guitar-Trailer.mp4',
    stylesImageDesktop: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-7.png',
    stylesImageMobile: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-6.png',
    courseOverview: [
      "Most guitarists think in terms of rhythm and lead, chords and melody - but true mastery comes from blending them into one seamless voice. The best players don't just play the notes; they make the instrument sing.",
      "In Peru, music is a conversation, between past and present, the instruments, between the dancer and the rhythm. Huayño's soaring melodies climb and tumble like the Andean landscape, Peruvian waltz flows with elegance before twisting into unexpected syncopation, and Festejo surges forward with the fiery pulse of Afro-Peruvian percussion. These styles aren't just techniques to learn, they're new ways to shape melody, control dynamics, and bring life to every note you play.",
      "Led by award-winning guitarist Camilo Menjura, this course breaks down the essential techniques of Peruvian guitar, translating the energy of full ensembles into a solo guitar approach. You'll develop a deeper understanding of phrasing, rhythmic flexibility, and harmonic movement while learning rich, expressive arrangements from one of the most musically diverse regions in the world.",
      "If you're ready to expand your musical vocabulary, unlock new levels of expression, and transform the way you approach the guitar, this course is for you."
    ],
    courseIncludes: [
      'Synced Notation & Tab',
      'Downloadable PDF Notation'
    ],
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
    ],
    faqs: [
      {
        question: 'Is there PDF notation and tab?',
        answer: 'Yes, each course includes notation and tab synchronised to the video lessons, which can also be downloaded as PDFs.'
      },
      {
        question: 'How long do I have to complete the course?',
        answer: 'Once enrolled, you have lifetime access, so you can complete the course at your own pace.'
      },
      {
        question: 'Do you offer memberships?',
        answer: 'Yes! If you\'d like access to all of our courses, you can start a membership.'
      }
    ]
  }
};

// Section IDs for navigation - shortened labels
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'expert', label: 'Your Expert' },
  { id: 'resources', label: 'Resources' },
  { id: 'faq', label: 'FAQ' }
];

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
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Section refs for scroll tracking
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Get course-specific config
  const courseConfig = getCourseConfig(course?.title);

  // Show sticky CTA when scrolled past hero and track active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyCTA(scrollY > 300);

      // Find active section
      const sectionPositions = SECTIONS.map(section => {
        const el = sectionRefs.current[section.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          return { id: section.id, top: rect.top };
        }
        return null;
      }).filter(Boolean) as { id: string; top: number }[];

      // Find section closest to top of viewport (with offset)
      const offset = 200;
      for (let i = sectionPositions.length - 1; i >= 0; i--) {
        if (sectionPositions[i].top <= offset) {
          setActiveSection(sectionPositions[i].id);
          break;
        }
      }
    };

    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

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
  const { addToCart } = useCart();

  const handleStartCourse = () => {
    if (isEnrolled) {
      navigate(`/courses/${courseId}/learn`);
    } else if (product) {
      navigate(`/checkout/${product.id}`);
    } else if (!user) {
      navigate('/auth');
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.base_price_usd,
        courseId: product.course_id || undefined,
        productType: product.product_type,
      });
      toast.success('Added to cart!');
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Left Sidebar - Course Curriculum */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-16 bottom-0 w-80 bg-card border-r border-border z-40 overflow-y-auto overflow-x-hidden hidden lg:block"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Course Curriculum</h3>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-2">
                <Accordion type="single" collapsible defaultValue={course.modules?.[0]?.id} className="space-y-1">
                  {course.modules?.map((module, i) => (
                    <AccordionItem key={module.id} value={module.id} className="border-none">
                      <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-3 py-2 rounded-md text-sm">
                        <div className="flex items-start gap-3 text-left">
                          <div className="w-7 h-7 bg-primary/10 rounded flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium break-words whitespace-normal">{module.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {module.lessons?.length || 0} lessons
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <div className="ml-10 space-y-0.5">
                          {module.lessons?.map((lesson) => (
                            <div 
                              key={lesson.id}
                              className="flex items-start gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 rounded-md cursor-default"
                            >
                              <Play className="w-3 h-3 shrink-0 mt-0.5" />
                              <span className="break-words whitespace-normal">{lesson.title}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle Button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-l-0 border-border rounded-r-lg p-2 shadow-lg hidden lg:flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Right Sidebar - Page Navigation (Overlay - doesn't push content) */}
        <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-full py-4 px-2 shadow-lg">
            <div className="flex flex-col items-center gap-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="group relative p-2"
                  title={section.label}
                >
                  {/* Tooltip on hover */}
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-card border border-border rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                    {section.label}
                  </span>
                  {/* Dot indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                    activeSection === section.id 
                      ? 'bg-primary scale-125' 
                      : 'bg-muted-foreground/40 group-hover:bg-muted-foreground'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content - no right margin since nav is overlay */}
        <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : ''}`}>
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

            <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-[70%_30%] gap-8 items-center w-full">
              {/* Left: Text content - 70% */}
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

                <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                  {course.description || `From Huayño to the Peruvian Waltz, immerse yourself in Andean culture and develop new guitar talents.`}
                </p>

                {/* Course stats */}
                <div className="flex flex-wrap gap-6 text-sm mb-6">
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

                {/* Price display */}
                {priceInfo && !isEnrolled && (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold">
                        {formatPrice(priceInfo.price, priceInfo.currency)}
                      </span>
                      {priceInfo.discount_percentage > 0 && (
                        <span className="text-lg text-muted-foreground line-through">
                          ${product?.base_price_usd?.toFixed(2)} USD
                        </span>
                      )}
                    </div>
                    {priceInfo.discount_percentage > 0 && (
                      <Badge variant="secondary" className="mt-2">
                        {priceInfo.discount_percentage}% off in your region
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mb-6">
                  <Button size="lg" onClick={handleStartCourse} className="gap-2">
                    {isEnrolled ? (
                      <>
                        <Play className="w-5 h-5" />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Enroll Now
                      </>
                    )}
                  </Button>
                </div>

                {/* Money-back guarantee */}
                {!isEnrolled && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Shield className="w-4 h-4" />
                    <span>30-Day 110% Money Back Guarantee</span>
                  </div>
                )}
              </motion.div>

              {/* Right: Course card with video play - 30% */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block"
              >
                <Card className="p-4 bg-card/80 backdrop-blur border-border/50">
                  {/* Course image with play button overlay */}
                  <div 
                    className="relative w-full aspect-video rounded-lg mb-4 overflow-hidden cursor-pointer group"
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
                        <Music className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    
                    {/* Play button overlay */}
                    {courseConfig?.trailerVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm mb-3">This Course Includes:</h3>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Synced Notation & Tab
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Downloadable PDF Notation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      Lifetime Access
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Student Community
                    </li>
                  </ul>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* Course Description Section */}
          <section 
            ref={el => sectionRefs.current['overview'] = el}
            className="py-20 bg-background"
          >
            <div className="max-w-4xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold mb-8">Could Your Guitar Sound More Melodic?</h2>
                <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                  {courseConfig?.courseOverview ? (
                    courseConfig.courseOverview.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                {/* Responsive styles image */}
                {courseConfig && (
                  <div className="mt-12">
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
              </motion.div>
            </div>
          </section>

          {/* Key Learning Outcomes */}
          <section 
            ref={el => sectionRefs.current['outcomes'] = el}
            className="py-20 bg-background border-t border-border/30"
          >
            <div className="max-w-4xl mx-auto px-6">
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

          {/* Meet Your Tutor Section */}
          {courseConfig?.expert && (
            <section 
              ref={el => sectionRefs.current['expert'] = el}
              className="py-20 bg-background border-t border-border/30"
            >
              <div className="max-w-4xl mx-auto px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="grid md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-1">
                      <img 
                        src={courseConfig.expert.image}
                        alt={courseConfig.expert.name}
                        className="w-full aspect-[3/4] object-cover rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <h2 className="text-3xl font-bold mb-2">Meet Your Tutor</h2>
                      <h3 className="text-xl text-primary mb-6">{courseConfig.expert.name}</h3>
                      <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
                        {courseConfig.expert.bio.map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* The Ultimate Learning Experience Section */}
          {courseConfig?.resources && (
            <section 
              ref={el => sectionRefs.current['resources'] = el}
              className="py-20 bg-background border-t border-border/30"
            >
              <div className="max-w-4xl mx-auto px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold mb-12 text-center">The Ultimate Learning Experience</h2>
                  <div className="grid md:grid-cols-2 gap-10">
                    {courseConfig.resources.map((resource, i) => (
                      <div key={i} className="flex flex-col md:flex-row gap-6 items-start">
                        <img 
                          src={resource.image}
                          alt={resource.title}
                          className="w-full md:w-40 h-auto object-contain rounded-lg shrink-0"
                        />
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                          <p className="text-muted-foreground text-sm">{resource.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* FAQ Section */}
          {courseConfig?.faqs && (
            <section 
              ref={el => sectionRefs.current['faq'] = el}
              className="py-20 bg-background border-t border-border/30"
            >
              <div className="max-w-3xl mx-auto px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <span className="text-primary font-medium">Common Questions</span>
                    </div>
                    <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
                  </div>

                  <div className="space-y-4">
                    {courseConfig.faqs.map((faq, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card className="overflow-hidden">
                          <Accordion type="single" collapsible>
                            <AccordionItem value={`faq-${i}`} className="border-none">
                              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                                <span className="text-left font-semibold">{faq.question}</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-6 pb-4">
                                <p className="text-muted-foreground">{faq.answer}</p>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="py-24 bg-background border-t border-border/30">
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
                {priceInfo && !isEnrolled && (
                  <p className="text-2xl font-bold mb-4">
                    {formatPrice(priceInfo.price, priceInfo.currency)}
                  </p>
                )}
                <Button size="lg" onClick={handleStartCourse} className="gap-2">
                  <Play className="w-5 h-5" />
                  {isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                </Button>
                {!isEnrolled && (
                  <p className="text-sm text-green-600 mt-4 flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    30-Day 110% Money Back Guarantee
                  </p>
                )}
              </motion.div>
            </div>
          </section>
        </main>
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
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
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
              <div className="flex items-center gap-4 min-w-0">
                {priceInfo && (
                  <div>
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
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600">
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
                <span>Enroll Now</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
