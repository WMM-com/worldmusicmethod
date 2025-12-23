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
import DOMPurify from 'dompurify';

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

// Learning outcome type
interface LearningOutcome {
  title: string;
  items: string[];
}

// Course-specific content configuration
const COURSE_CONFIG: Record<string, {
  heroBackground: string;
  courseImage: string;
  trailerVideo: string;
  stylesImageDesktop: string;
  stylesImageMobile: string;
  courseOverview: string[];
  overviewHeading?: string;
  expert?: {
    name: string;
    image: string;
    bio: string[];
  };
  resources?: ResourceItem[];
  courseIncludes?: string[];
  faqs?: FAQItem[];
  learningOutcomes?: LearningOutcome[];
  instrumentTag?: string;
}> = {
  // Peruvian Guitar Styles course config
  'peruvian-guitar-styles': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/05/Peruvian-Guitar-2-1.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/04/Peruvian-Guitar-1.jpg',
    trailerVideo: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Argentinian-Guitar-Trailer.mp4',
    stylesImageDesktop: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-7.png',
    stylesImageMobile: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-6.png',
    overviewHeading: 'Could Your Guitar Sound More Melodic?',
    instrumentTag: 'Guitar',
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
    learningOutcomes: [
      { title: 'Master Essential Peruvian Guitar Styles', items: ['Develop an authentic feel for Huayño, Carnavalito, Waltz, Festejo, and Landó', 'Learn strumming and fingerstyle techniques specific to each genre'] },
      { title: 'Enhance Your Technical & Musical Skills', items: ['Build precision in syncopated rhythms and dynamic phrasing', 'Combine chord-melody playing with intricate bass movements'] },
      { title: 'Deepen Your Understanding of Peruvian Music', items: ['Explore the historical and cultural significance behind each style', "Understand the guitar's role in Andean, Creole, and Afro-Peruvian traditions"] },
      { title: 'Play With Authenticity and Confidence', items: ['Learn directly from a specialist in Latin American folk guitar', 'Develop a versatile repertoire suited for both solo and ensemble performance'] }
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
  },
  // Senegalese Drum Kit - Origins course config
  'senegalese-drum-kit-–-origins': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/Cover-Image-2-scaled.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/Cover-Image-2-scaled.jpg',
    trailerVideo: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/SENEGALESE-DRUM-KIT-TRAILER.mp4',
    stylesImageDesktop: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/New-Project-4-1.png',
    stylesImageMobile: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/Senegalese-Drum-Kit-Rhythms-Horizontal-Vertical-1.png',
    overviewHeading: 'Senegalese Rhythm Mastery: Tradition, Technique & Translation',
    instrumentTag: 'Drum Kit & Percussion',
    courseOverview: [
      "Senegalese drumming is one of the most complex and electrifying rhythmic traditions in the world. Its patterns are built on syncopations, accents, and phrasing that challenge even highly experienced African musicians not because of speed or power, but because of an intricate internal logic that is rarely taught in a clear, structured way. This course breaks that barrier. You'll learn the foundations of Wolof, Mandinka, and Diola rhythms with precise counting, notation, and drum tab so you can finally understand exactly how these grooves work and how they translate onto the drum kit.",
      "This course which is led by Matar Ndiongue, one of the most respected drummers from the Casamance region, takes you inside the rhythmic language behind styles such as Lamboul, Kaolack, Sankour Badin, Diambadong, Bougarabou, and Ekonkon. Each rhythm is demonstrated slowly, shown with the band, and supported by PDF notation, on-screen guidance, and close-up camera work.",
      "Senegalese music does not follow standard Western song structures. Instead, the drummer drives the narrative: cueing changes, shaping dynamics, communicating transitions, and maintaining the forward motion of the music. This course shows you not only what to play, but why specific fills, accents, and signals matter, and how to use them in real musical situations.",
      "By the end of the journey, you'll understand the origins of these rhythms, how they evolved onto the modern drum kit, and how to perform them with authenticity, confidence, and cultural awareness."
    ],
    courseIncludes: [
      'Synced Notation & Tab',
      'Downloadable PDF Notation',
      'Full Band Masterclasses',
      'Professional Backing Tracks'
    ],
    learningOutcomes: [
      { title: 'Master Core Senegalese Drum Kit Foundations', items: ['Identify and count the key rhythmic structures used in Wolof, Mandinka, and Diola traditions', 'Translate traditional percussion ensemble patterns into clear, playable drum-kit parts', 'Perform six essential rhythms: Lamboul, Kaolack, Sankour Badin, Diambadong, Bougarabou and Ekonkon with accuracy and stylistic awareness'] },
      { title: 'Develop Technical & Musical Control', items: ['Build complete grooves step-by-step, from foundational pulses to full-speed performance', 'Apply variations, fills, signals, and transitions appropriate to each style', 'Maintain hi-hat pulse, internal subdivision, and ensemble alignment when playing complex syncopations'] },
      { title: 'Lead & Communicate Within an Ensemble', items: ['Use cues, accents, and bakk-based call-and-response techniques to guide a band', 'Shape dynamics, energy, and phrasing to drive musical direction in non-Western song structures', 'Recognise when to add intensity, when to pull back, and how to support other instruments effectively'] },
      { title: 'Understand Cultural & Historical Context', items: ['Explain how traditional percussion (Sabar, Serouba, Bougarabou) informs modern Senegalese drum-kit interpretation', 'Demonstrate awareness of regional distinctions between Wolof, Mandinka, and Diola rhythmic languages', 'Connect technical skills with the cultural origins and purpose of each rhythm'] }
    ],
    expert: {
      name: 'Matar Ndiongue',
      image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/Meet-Your-Tutor.jpg',
      bio: [
        "Matar Ndiongue is one of the leading drum-kit interpreters of Senegalese traditional rhythms, known for his rare ability to translate complex Wolof, Mandinka, and Diola percussion patterns onto the modern drum kit with clarity, authenticity, and power.",
        "Born and raised in Ziguinchor, Casamance, Matar began his musical life as a traditional percussionist, performing at baptisms, weddings, naming ceremonies, and community gatherings. His deep grounding in Sabar, Serouba, Bougarabou, and other traditions shaped his instinctive understanding of pulse, feel, and communication.",
        "In 2003, Matar transitioned from hand percussion to drum kit, bringing with him the phrasing and energy of Senegal's traditional ensembles. Today, he is widely recognised as one of the region's most skilled drummers, performing with respected artists including Solo Cissokho, Pene 2, Wassa Kouyaté, and Jalikunda Cissokho.",
        "In recent years, Matar has also begun releasing his own music under the stage name Pa Matar, blending modern drum-kit grooves with traditional Senegalese rhythmic identity."
      ]
    },
    resources: [
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/main-monitor.png',
        title: 'Senegalese Drum Kit - Origins',
        description: 'Comprehensive lessons covering six essential rhythms: Lamboul, Kaolack, Sankour Badin, Diambadong, Bougarabou and Ekonkon with step-by-step instruction.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/software-box.png',
        title: 'Interactive On-screen Notation',
        description: 'Access on-screen notation, tablature, slow motion and more with our innovative Soundslice integration.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/11/masterclasss.png',
        title: 'Full Band Masterclass',
        description: 'See how Senegalese bands connect and communicate on stage with masterclass footage filmed in Senegal.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Senegalese-Drum-Kit-4.png',
        title: 'African Backing Tracks',
        description: 'Practice your grooves with professionally recorded backing tracks featuring authentic percussion, bass, keys, and guitar.'
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
        answer: "Yes! If you'd like access to all of our courses, you can start a membership."
      }
    ]
  },
  // Tuareg Guitar Philosophy course config
  'tuareg-guitar-philosophy': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
    trailerVideo: '',
    stylesImageDesktop: '',
    stylesImageMobile: '',
    overviewHeading: 'Tradition, Technique, and the Spirit of Desert Music',
    instrumentTag: 'Guitar',
    courseOverview: [
      "Tuareg Guitar Philosophy invites you into the heart of the Sahara's sound world, guided by internationally acclaimed guitarist Bombino. This course is more than a step-by-step method, it is a journey through desert traditions, improvisation, rhythm, and the philosophy that makes Tuareg guitar one of the most distinctive musical voices on the planet.",
      "Across six modules, you will gain access to Bombino's personal techniques, his approach to tone and expression, and the cultural roots that shape his music. From learning the foundational hammer-on and pull-off phrasing to exploring desert rhythms, improvisation, and healing sounds, you will develop not only technical fluency but also a deeper understanding of Tuareg musical identity.",
      "The course blends guitar demonstrations with rich cultural context, drawing from Bombino's experiences performing worldwide, composing celebrated songs, and carrying forward the traditions of the Sahara. Each lesson combines notation, tab, and ear-based learning, while encouraging you to improvise and create in the spirit of desert music.",
      "Whether you are an adventurous guitarist, a lover of African music, or simply curious about how rhythm and melody become one in the Sahara, this course equips you with tools, inspiration, and philosophy to play and think like a Tuareg guitarist."
    ],
    courseIncludes: [
      'Synced Notation & Tab',
      'Downloadable PDF Notation',
      'Sahel Backing Tracks',
      'Rhythmic Insights'
    ],
    learningOutcomes: [
      { title: 'Technical Fluency', items: ['Execute hammer-on and pull-off techniques with precision', 'Apply right-hand phrasing to shape tone and emotion', 'Play rhythm and lead parts together with desert-inspired fluency'] },
      { title: 'Cultural & Musical Understanding', items: ['Recognize the role of the Tendé drum and its influence on Tuareg guitar rhythms', 'Identify how different Nigerien musical cultures contribute to Tuareg guitar', 'Understand the symbolic power of the guitar in desert communities'] },
      { title: 'Creative Expression', items: ['Compose and improvise melodies within Tuareg scales and grooves', "Apply Bombino's improvisational philosophy to develop your own sound"] },
      { title: 'Advanced Application', items: ['Perform traditional and fast-paced Tuareg grooves with confidence', 'Integrate Tuareg musical principles into your own compositions and performances'] }
    ],
    expert: {
      name: 'Bombino',
      image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
      bio: [
        "Bombino (Omara Moctar), born in Agadez, Niger, is one of the world's most celebrated Tuareg guitarists and songwriters. Growing up in the Sahara, he learned music by ear, inspired by the traditions of his people and the sounds of global guitar legends. Forced into exile during political unrest, he spent years in Algeria and Burkina Faso, refining his style and absorbing diverse influences before returning to share his music with the world.",
        "His rise to international recognition began when filmmaker Ron Wyman created a documentary about him, catapulting Bombino from desert stages to global tours. Since then, Bombino has recorded critically acclaimed albums, collaborated with artists such as Dan Auerbach of The Black Keys, and earned a Grammy nomination, the first ever for a Nigerien artist.",
        "Despite his success, Bombino remains deeply connected to the Sahara. His music carries themes of resilience, freedom, and healing, often blending tradition with modern expression. With a fluid guitar style that merges hypnotic rhythm, soaring melody, and improvisation, he is celebrated not only as a musician but as a voice of his culture.",
        "Through this course, Bombino shares not only his techniques but his philosophy: that the guitar is both an instrument of expression and a symbol of unity in the desert."
      ]
    },
    resources: [
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
        title: 'Tuareg Guitar Philosophy',
        description: "Engage with immersive lessons exploring the sound, style, and spirit of Tuareg guitar. Learn about Bombino's unique phrasing, desert rhythms, and the cultural philosophy that shapes this powerful music tradition."
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-2.png',
        title: 'Interactive On-Screen Notation',
        description: "Follow along with crystal-clear notation and tablature synced directly to the videos. With virtual fretboards, slow-motion playback, and looping tools, you'll master every detail of Bombino's style at your own pace."
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
        title: 'Rhythmic Insights',
        description: "Corey Wilhelm, Bombino's drummer for over 12 years, breaks down the calabash and drum kit patterns that drive Tuareg music. These rhythm studies give you a complete foundation for understanding how percussion and guitar interlock."
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/10/Bombino-1.jpg',
        title: 'Sahel Backing Tracks',
        description: 'Jam with Bombino over interactive backing track playalong versions of songs from the 2023 Sahel album. Play guitar along with the chord charts for Tuareg songs including Aitma, Darfuq and Si Chilan.'
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
        answer: "Yes! If you'd like access to all of our courses, you can start a membership."
      }
    ]
  },
  // African Bass: Egypt & Zimbabwe course config
  'african-bass-masterclass-egypt-zimbabwe': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
    trailerVideo: '',
    stylesImageDesktop: '',
    stylesImageMobile: '',
    overviewHeading: 'Unexpected. Redefine Your Groove.',
    instrumentTag: 'Bass',
    courseOverview: [
      "The African Bass Masterclass: Egypt & Zimbabwe offers a dynamic exploration of bass styles from two distinct musical regions of the continent, North and Southern Africa. From the intricate, modal-infused grooves of Egypt to the deeply rooted, rhythmically driven traditions of Zimbabwe and Congo, this course takes you on a journey through both ancient pulse and modern adaptation.",
      "It is designed for intermediate to advanced players and it features immersive, regionally focused modules where you'll build the skills needed to create authentic basslines and develop the musical insight to improvise, compose, and collaborate across genres. You'll explore Egyptian rhythmic structures, Middle Eastern modes like Hijazz, Zimbabwean Chimurenga patterns, traditional Shona grooves, and Congolese Sebene phrasing. Each module is accompanied by hands-on exercises, breakdowns, and backing tracks.",
      "This is more than a technique course. You'll gain cultural context, historical insight, and a deeper understanding of how bass functions not just as accompaniment, but as a driving force in African music. Each lesson connects theory to feel, offering you the tools to express yourself with groove, creativity, and confidence.",
      "Whether you're a jazz player expanding your vocabulary, a session bassist exploring new rhythmic textures, or a curious learner drawn to African music traditions, this course equips you with the skills and knowledge to bring depth, energy, and authenticity to every note you play."
    ],
    courseIncludes: [
      'Synced Notation & Tab',
      'Downloadable PDF Notation',
      'Authentic African Backing Tracks',
      'Chimurenga Masterclass'
    ],
    learningOutcomes: [
      { title: 'Rhythmic Mastery', items: ['Recognize and perform complex African rhythms such as Maqsum, Saidi, and Masmoudi Saghir', 'Execute 12/8 rhythmic patterns found in Zimbabwean Chimurenga music', 'Develop time-keeping and pulse awareness through extended groove-based exercises'] },
      { title: 'Modal and Scale Fluency', items: ['Identify and apply Middle Eastern modes like Hijazz in bass improvisation', 'Adapt scales and melodic phrasing to match traditional African tonal frameworks', 'Modulate key signatures fluently while maintaining stylistic integrity'] },
      { title: 'Cultural & Musical Adaptability', items: ['Analyze regional characteristics of Egyptian, Congolese, and Zimbabwean bass styles', 'Reproduce culturally specific ornamentation and groove development techniques', 'Apply African stylistic techniques across modern genres like funk, jazz, and gospel'] },
      { title: 'Creative Application', items: ['Compose and improvise original basslines using call-and-response principles', 'Integrate African rhythmic and melodic elements into collaborative or solo projects', 'Respond musically to backing tracks with authentic phrasing and groove awareness'] }
    ],
    expert: {
      name: 'Edd Bateman',
      image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
      bio: [
        "At 14 years old, Edd Bateman was playing heavy metal basslines in his bedroom when his mother interrupted with an unexpected opportunity. A Zimbabwean Sungura and Chimurenga dance band, Chimanimani, had just arrived in England and needed a bass player immediately. With barely a week to prepare, Edd took the gig. Within a month, he found himself playing African nightclubs in London, university venues, and even Glastonbury Festival. He stayed with Chimanimani for six years, learning the intricacies of Zimbabwean bass firsthand.",
        "In his early 20s, Edd's focus shifted to West Africa, where he began intensive training with the Cissokho family of griots in Senegal. Performing marathon five-hour shows alongside Solo Cissokho, Seckou Keita, Sadio Cissokho, and the Jalikunda family, he absorbed the deep rhythmic traditions of Mbalax and Mandinka music. Guest appearances with Cheikh Lô, Orchestra Baobab, and Super Diamono solidified his reputation as a versatile and instinctive player.",
        "With thousands of concerts to his name, Edd has led bands blending African and global styles, including London Astrobeat Orchestra and Edd Bateman's West African Love Affair. In 2020, recognizing the lack of structured learning for African bass guitar, he founded World Music Method, an online platform dedicated to sharing the techniques and traditions of African and world music.",
        "In 2024, Edd was called in at the last minute to tour with Sahara Desert Blues virtuoso Bombino, stepping onto the stage without rehearsal. In 2025, he expanded his musical journey to India and Pakistan, performing alongside Ustad Shafqat Ali Khan and leading members of the Sham Chaurasi Gharana. His deep foundation in African music allowed him to adapt instantly, navigating unfamiliar repertoire on the spot, a skill that defines a truly masterful bass player."
      ]
    },
    resources: [
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
        title: 'African Bass Masterclass: Egypt & Zimbabwe',
        description: 'Immersive lessons teaching you to master bass styles from North and Southern Africa. Explore the modal grooves of Egypt, the rhythmic traditions of Zimbabwe, and a bonus module including rich phrasing of Congo to redefine your bass playing.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-2.png',
        title: 'Interactive On-Screen Notation',
        description: 'Learn faster and more effectively with our on-screen notation and tablature. Use virtual fretboards, slow motion, and looping to break down each exercise step by step.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
        title: 'Authentic African Backing Tracks',
        description: 'Put your skills into practice with region-specific backing tracks. Groove to Egyptian rhythms, Zimbabwean Chimurenga, and Congolese Sebene feels while developing authentic phrasing and timing.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/Right-Hand-Edd-Bass-18.02_32_18_22.Still001.jpg',
        title: 'Chimurenga Masterclass',
        description: "Learn from the best. Watch legendary Zimbabwean guitarist Gilbert Zvamaida's exclusive World Music Method masterclass and learn about the Chimurenga genre from Thomas Mapfumo's right hand guitarist."
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
        answer: "Yes! If you'd like access to all of our courses, you can start a membership."
      }
    ]
  },
  // Contrary Motion For Guitar course config
  'contrary-motion-for-guitar': {
    heroBackground: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/CMG-Cover-Image.jpg',
    courseImage: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/CMG-Cover-Image.jpg',
    trailerVideo: '',
    stylesImageDesktop: '',
    stylesImageMobile: '',
    overviewHeading: 'Unlock Melodic Depth and Harmonic Balance',
    instrumentTag: 'Guitar',
    courseOverview: [
      "Contrary Motion for Guitar is a deep dive into one of the most expressive and overlooked aspects of guitar playing: the art of movement between intervals. This course breaks down the technical foundations, right-hand mechanics, and the creative possibilities of contrary motion to help you expand your phrasing and compositional voice.",
      "Through carefully structured lessons, you'll explore intervals across the fretboard, develop right-hand fluency, and learn how masters of African and classical traditions have used contrary motion and sixths to craft iconic lines. You'll practice these concepts in progressive exercises before applying them to create your own musical ideas.",
      "This course is not about copying licks, it's about understanding the mechanics of the guitar and unlocking a new way of thinking about harmony and melody. With Niwel's guidance, you'll discover how to connect theory, technique, and creativity into one seamless approach.",
      "Whether you're a classical guitarist, an improviser, or a songwriter searching for new textures, this course will give you the tools to create lines that move with clarity, contrast, and musical depth."
    ],
    courseIncludes: [
      'Synced Notation & Tab',
      'Downloadable PDF Notation',
      '5+ Hours of Lessons',
      'Masterclass Session'
    ],
    learningOutcomes: [
      { title: 'Build Interval Foundations', items: ['Identify and play intervals across the fretboard with accuracy', 'Recognize the role of intervals in shaping harmony and melodic lines', 'Apply interval exercises to strengthen both hands'] },
      { title: 'Develop Right-Hand Technique', items: ['Execute chord-based and interval-based picking patterns with control', 'Strengthen finger independence and dexterity in the right hand', 'Understand how muscle coordination and finger mechanics impact technique'] },
      { title: 'Master the 6th Interval', items: ['Use the interval of a 6th in creating melodic and harmonic ideas', 'Practice across positions to achieve fretboard fluency', "Draw inspiration from Franco Luambo's use of 6ths in African guitar music"] },
      { title: 'Expand Contrary Motion', items: ['Combine 3rds, 6ths, and other intervals in contrary motion', 'Apply classical approaches of contrary motion to guitar playing', 'Experiment with intervallic variation to create musical tension and release'] },
      { title: 'Create Musical Lines', items: ['Build complete melodic lines using intervals in contrary motion', 'Integrate 2nds, 3rds, and 6ths into improvisation and composition', 'Transform technical exercises into creative tools for writing guitar parts'] }
    ],
    expert: {
      name: 'Niwel Tsumbu',
      image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/CMG-Cover-Image.jpg',
      bio: [
        "Niwel Tsumbu is an internationally acclaimed guitarist and composer whose work bridges African traditions, European classical music, and contemporary improvisation. Originally from the Democratic Republic of Congo, he has developed a unique voice on the guitar that blends rhythmic intricacy with lyrical expressiveness.",
        "Over the past two decades, Niwel has performed at major festivals, collaborated with global artists, and released music that showcases his mastery of melody and groove. His teaching reflects not just technical expertise, but a deep understanding of how guitar can be both a solo instrument and a voice within an ensemble.",
        "In this course, Niwel shares his personal approach to intervals and contrary motion, concepts he has refined through years of study and performance. His guidance will help you move beyond exercises into music-making, giving you tools to develop your own style while connecting to a broader tradition of guitar artistry."
      ]
    },
    resources: [
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/CMG-Cover-Image.jpg',
        title: 'Contrary Motion for Guitar',
        description: '5+ hours of in-depth lessons exploring intervals, 6ths, and contrary motion. Learn how to blend classical concepts with African guitar traditions to create rich, expressive musical lines.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Peruvian-Guitar-Styles-2.png',
        title: 'Interactive On-Screen Notation',
        description: 'Follow along with precision using our interactive tools. Access on-screen notation, tablature, virtual fretboards, slow motion, and looping to master each exercise at your own pace.'
      },
      {
        image: 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2025/09/CMG-Cover-Image.jpg',
        title: 'Niwel Tsumbu – Masterclass',
        description: "Join Niwel's next masterclass or revisit the recording. This session is a great opportunity to connect and get your questions answered in order to take your guitar technique even further."
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
        answer: "Yes! If you'd like access to all of our courses, you can start a membership."
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

// Navigation wheel component with hover/scroll visibility
const NavigationWheel = ({ 
  sections, 
  activeSection, 
  onNavigate,
  visible 
}: { 
  sections: typeof SECTIONS;
  activeSection: string;
  onNavigate: (id: string) => void;
  visible: boolean;
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeIndex = sections.findIndex(s => s.id === activeSection);
  
  // Track scrolling state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1500); // Hide after 1.5s of no scrolling
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  const cycleUp = () => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : sections.length - 1;
    onNavigate(sections[newIndex].id);
  };
  
  const cycleDown = () => {
    const newIndex = activeIndex < sections.length - 1 ? activeIndex + 1 : 0;
    onNavigate(sections[newIndex].id);
  };

  if (!visible) return null;

  const shouldShow = isHovering || isScrolling;

  return (
    <>
      {/* Hover detection zone on right side of screen */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-24 z-40 hidden lg:block"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
      <motion.nav
        initial={{ opacity: 0, x: 20 }}
        animate={{ 
          opacity: shouldShow ? 1 : 0, 
          x: shouldShow ? 0 : 20,
          pointerEvents: shouldShow ? 'auto' : 'none'
        }}
        transition={{ duration: 0.2 }}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Solid background card */}
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          {/* Up arrow */}
          <button
            onClick={cycleUp}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors w-full flex justify-center"
            aria-label="Previous section"
          >
            <ChevronRight className="w-5 h-5 rotate-[-90deg]" />
          </button>

          {/* Section labels wheel */}
          <div className="relative h-32 w-28 overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {sections.map((section, index) => {
                const distance = index - activeIndex;
                const isActive = distance === 0;
                const isVisible = Math.abs(distance) <= 1;
                
                if (!isVisible) return null;
                
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => onNavigate(section.id)}
                    initial={false}
                    animate={{
                      y: distance * 28,
                      opacity: isActive ? 1 : 0.4,
                      scale: isActive ? 1 : 0.85,
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`absolute text-center text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {section.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Down arrow */}
          <button
            onClick={cycleDown}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors w-full flex justify-center"
            aria-label="Next section"
          >
            <ChevronRight className="w-5 h-5 rotate-90" />
          </button>
        </div>
      </motion.nav>
    </>
  );
};

// Helper to get config by course title/slug
const getCourseConfig = (courseTitle?: string) => {
  if (!courseTitle) return null;
  const slug = courseTitle.toLowerCase().replace(/\s+/g, '-');
  return COURSE_CONFIG[slug] || null;
};

// Type for database landing page data
interface DBLandingPage {
  id: string;
  course_id: string;
  hero_background_url: string | null;
  course_image_url: string | null;
  trailer_video_url: string | null;
  styles_image_desktop: string | null;
  styles_image_mobile: string | null;
  overview_heading: string | null;
  course_overview: string[] | null;
  instrument_tag: string | null;
  course_includes: string[] | null;
  expert_name: string | null;
  expert_image_url: string | null;
  expert_bio: string[] | null;
  resources: ResourceItem[] | null;
  faqs: FAQItem[] | null;
  learning_outcomes: { title: string; description: string }[] | null;
  learning_outcomes_intro: string | null;
  cta_title: string | null;
  cta_description: string | null;
}

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
  const [showNavWheel, setShowNavWheel] = useState(false);

  // Section refs for scroll tracking
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fetch landing page data from database
  const { data: dbLandingPage } = useQuery({
    queryKey: ['course-landing-page', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_landing_pages')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Get hardcoded course-specific config as fallback
  const hardcodedConfig = getCourseConfig(course?.title);

  // Helper to convert DB learning outcomes (with description string) to frontend format (with items array)
  const convertLearningOutcomes = (dbOutcomes: { title: string; description: string }[] | null): LearningOutcome[] => {
    if (!dbOutcomes?.length) return [];
    return dbOutcomes.map(outcome => ({
      title: outcome.title,
      items: outcome.description.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    }));
  };

  // Merge database data with hardcoded config (database takes priority)
  const courseConfig = dbLandingPage ? {
    heroBackground: dbLandingPage.hero_background_url || hardcodedConfig?.heroBackground || '',
    courseImage: dbLandingPage.course_image_url || hardcodedConfig?.courseImage || '',
    trailerVideo: dbLandingPage.trailer_video_url || hardcodedConfig?.trailerVideo || '',
    stylesImageDesktop: dbLandingPage.styles_image_desktop || hardcodedConfig?.stylesImageDesktop || '',
    stylesImageMobile: dbLandingPage.styles_image_mobile || hardcodedConfig?.stylesImageMobile || '',
    overviewHeading: dbLandingPage.overview_heading || hardcodedConfig?.overviewHeading || '',
    courseOverview: (dbLandingPage.course_overview as string[] | null)?.length ? dbLandingPage.course_overview as string[] : hardcodedConfig?.courseOverview || [],
    instrumentTag: dbLandingPage.instrument_tag || hardcodedConfig?.instrumentTag || 'Music',
    courseIncludes: (dbLandingPage.course_includes as string[] | null)?.length ? dbLandingPage.course_includes as string[] : hardcodedConfig?.courseIncludes || [],
    expert: (dbLandingPage.expert_name || hardcodedConfig?.expert) ? {
      name: dbLandingPage.expert_name || hardcodedConfig?.expert?.name || '',
      image: dbLandingPage.expert_image_url || hardcodedConfig?.expert?.image || '',
      bio: (dbLandingPage.expert_bio as string[] | null)?.length ? dbLandingPage.expert_bio as string[] : hardcodedConfig?.expert?.bio || []
    } : undefined,
    resources: ((dbLandingPage.resources as unknown) as ResourceItem[] | null)?.length ? (dbLandingPage.resources as unknown) as ResourceItem[] : hardcodedConfig?.resources || [],
    faqs: ((dbLandingPage.faqs as unknown) as FAQItem[] | null)?.length ? (dbLandingPage.faqs as unknown) as FAQItem[] : hardcodedConfig?.faqs || [],
    learningOutcomes: convertLearningOutcomes(dbLandingPage.learning_outcomes as { title: string; description: string }[] | null).length 
      ? convertLearningOutcomes(dbLandingPage.learning_outcomes as { title: string; description: string }[] | null) 
      : hardcodedConfig?.learningOutcomes || [],
    learningOutcomesIntro: dbLandingPage.learning_outcomes_intro || 'By the end of this course, you will be able to:',
    ctaTitle: dbLandingPage.cta_title || 'Ready To Start Your Journey?',
    ctaDescription: dbLandingPage.cta_description || 'Join a worldwide community of musicians.',
  } : hardcodedConfig ? {
    ...hardcodedConfig,
    learningOutcomesIntro: 'By the end of this course, you will be able to:',
    ctaTitle: 'Ready To Start Your Journey?',
    ctaDescription: 'Join a worldwide community of musicians.',
  } : null;

  // Show sticky CTA when scrolled past hero and track active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.7; // 70vh hero
      setShowStickyCTA(scrollY > 300);
      setShowNavWheel(scrollY > heroHeight - 100);

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
    } else if (product && priceInfo) {
      // Add to cart silently, then go to checkout
      addToCart({
        productId: product.id,
        name: product.name,
        price: priceInfo.price,
        currency: priceInfo.currency,
        courseId: product.course_id || undefined,
        productType: product.product_type,
      });
      navigate(`/checkout`);
    } else if (!user) {
      navigate('/auth');
    }
  };

  const handleAddToCart = () => {
    if (product && priceInfo) {
      addToCart({
        productId: product.id,
        name: product.name,
        price: priceInfo.price,
        currency: priceInfo.currency,
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
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
              
              {/* Watch Preview button in sidebar */}
              {courseConfig?.trailerVideo && (
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors border-b border-border"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 text-primary fill-primary ml-0.5" />
                  </div>
                  Watch Preview
                </button>
              )}
              
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
              {/* Bottom close button */}
              <div className="p-4 border-t border-border flex justify-center">
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle Button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-l-0 border-border rounded-r-lg px-3 py-2 shadow-lg hidden lg:flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span className="text-sm font-medium">View Curriculum</span>
          </button>
        )}

        {/* Right Sidebar - Page Navigation Wheel (Overlay - appears after hero) */}
        <AnimatePresence>
          <NavigationWheel
            sections={SECTIONS}
            activeSection={activeSection}
            onNavigate={scrollToSection}
            visible={showNavWheel}
          />
        </AnimatePresence>

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

            <div className="relative max-w-6xl mx-auto px-6 lg:pr-12 py-20 grid lg:grid-cols-[70%_30%] gap-8 items-center w-full">
              {/* Left: Text content - 70% */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {courseConfig?.instrumentTag || 'Music'}
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
                    <span>
                      {totalDuration >= 3600 
                        ? `${Math.floor(totalDuration / 3600)}h ${Math.round((totalDuration % 3600) / 60)}m`
                        : `${Math.round(totalDuration / 60)} min`
                      }
                    </span>
                  </div>
                </div>

                {/* Price display */}
                {priceInfo && !isEnrolled && (
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-yellow-500">
                      {formatPrice(priceInfo.price, priceInfo.currency)}
                    </span>
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                        </div>
                        <span className="mt-2 px-3 py-1 bg-black/60 rounded text-white text-xs font-medium">
                          Watch Preview
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm mb-3">This Course Includes:</h3>
                  <ul className="space-y-2 text-xs">
                    {(courseConfig?.courseIncludes?.length ? courseConfig.courseIncludes : ['Synced Notation & Tab', 'Downloadable PDF Notation', 'Lifetime Access', 'Student Community']).map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                        {item}
                      </li>
                    ))}
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
            <div className="max-w-6xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold mb-8 text-center">{courseConfig?.overviewHeading || 'Course Overview'}</h2>
                <div className="prose prose-lg dark:prose-invert max-w-none mb-8 space-y-6">
                  {courseConfig?.courseOverview ? (
                    courseConfig.courseOverview.map((paragraph, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph) }} />
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
                        the dancer and the rhythm.
                      </p>
                      <p>
                        Huayño's soaring melodies climb and tumble like the Andean 
                        landscape, Peruvian waltz flows with elegance before twisting into unexpected syncopation, 
                        and Festejo surges forward with the fiery pulse of Afro-Peruvian percussion.
                      </p>
                    </>
                  )}
                </div>

                {/* Responsive styles image */}
                {courseConfig?.stylesImageDesktop && (
                  <div className="mt-12">
                    {/* Desktop/Tablet image */}
                    <img 
                      src={courseConfig.stylesImageDesktop}
                      alt={course.title}
                      className="hidden md:block w-full h-auto rounded-lg"
                    />
                    {/* Mobile image */}
                    {courseConfig.stylesImageMobile && (
                      <img 
                        src={courseConfig.stylesImageMobile}
                        alt={course.title}
                        className="md:hidden w-full h-auto rounded-lg"
                      />
                    )}
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
            <div className="max-w-6xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold mb-4">Key Learning Outcomes</h2>
                <p className="text-muted-foreground">{courseConfig?.learningOutcomesIntro || 'By the end of this course, you will be able to:'}</p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {(courseConfig?.learningOutcomes || [
                  { title: 'Master Core Techniques', items: ['Develop fundamental skills for this style', 'Learn essential patterns and approaches'] },
                  { title: 'Enhance Your Musical Skills', items: ['Build precision in rhythmic and dynamic phrasing', 'Combine various techniques effectively'] },
                  { title: 'Deepen Your Understanding', items: ['Explore the cultural significance behind each style', 'Understand the role of your instrument in this tradition'] },
                  { title: 'Play With Authenticity', items: ['Learn directly from specialist instructors', 'Develop a versatile repertoire'] }
                ]).map((outcome, i) => {
                  const icons = [Music, Award, Headphones, CheckCircle];
                  const IconComponent = icons[i % icons.length];
                  return (
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
                            <IconComponent className="w-6 h-6 text-primary" />
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
                  );
                })}
              </div>
            </div>
          </section>

          {/* Meet Your Tutor Section */}
          {courseConfig?.expert && (
            <section 
              ref={el => sectionRefs.current['expert'] = el}
              className="py-20 bg-background border-t border-border/30"
            >
              <div className="max-w-6xl mx-auto px-6">
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
                      <h2 className="text-3xl font-bold mb-2">Meet Your Expert</h2>
                      <h3 className="text-xl text-primary mb-6">{courseConfig.expert.name}</h3>
                      <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
                        {courseConfig.expert.bio.map((paragraph, i) => (
                          <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph) }} />
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
              <div className="max-w-6xl mx-auto px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold mb-12 text-center">The Ultimate Learning Experience</h2>
                  <div className="relative">
                    {/* Single vertical divider line */}
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      {courseConfig.resources.map((resource, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-4 items-start">
                          <img 
                            src={resource.image}
                            alt={resource.title}
                            className="w-full md:w-72 h-auto object-contain rounded-lg shrink-0"
                          />
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                            <p className="text-muted-foreground text-sm">{resource.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
              <div className="max-w-6xl mx-auto px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
                  </div>

                  <div className="space-y-4 max-w-3xl mx-auto">
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
            <div className="max-w-6xl mx-auto px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
              <h2 className="text-3xl font-bold mb-4">{courseConfig?.ctaTitle || 'Ready To Start Your Journey?'}</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  {courseConfig?.ctaDescription || 'Join a worldwide community of musicians.'}
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
