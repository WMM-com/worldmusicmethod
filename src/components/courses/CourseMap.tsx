import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseModule } from '@/types/course';

interface CourseMapProps {
  modules: CourseModule[];
  completedLessons: Set<string>;
  totalLessonsPerModule: Map<string, number>;
  onModuleSelect: (moduleId: string) => void;
  selectedModuleId?: string;
  courseTitle: string;
  courseCountry: string;
}

// Abstract genre zones - not tied to exact cities
const GENRE_ZONES: Record<string, { x: number; y: number; zone: string; description: string }> = {
  'huayño': { x: 62, y: 48, zone: 'Andean Highlands', description: 'Traditional mountain rhythms' },
  'sonqollay': { x: 52, y: 52, zone: 'Central Andes', description: 'Heartfelt melodies' },
  'carnavalito': { x: 68, y: 58, zone: 'Altiplano', description: 'Festival celebrations' },
  'waltz': { x: 38, y: 42, zone: 'Coastal Cities', description: 'Elegant criollo traditions' },
  'vals': { x: 38, y: 42, zone: 'Coastal Cities', description: 'Romantic ballroom styles' },
  'festejo': { x: 40, y: 50, zone: 'Southern Coast', description: 'Afro-Peruvian rhythms' },
  'landó': { x: 42, y: 54, zone: 'Chincha Valley', description: 'African heritage sounds' },
  'marinera': { x: 36, y: 32, zone: 'Northern Coast', description: 'Courtship dance traditions' },
  'tondero': { x: 30, y: 22, zone: 'Far North', description: 'Rural coastal expressions' },
  'muliza': { x: 48, y: 44, zone: 'Junín Region', description: 'Mining town heritage' },
  'huaylas': { x: 42, y: 34, zone: 'Callejón de Huaylas', description: 'Valley celebrations' },
  'yaraví': { x: 58, y: 60, zone: 'Southern Highlands', description: 'Melancholic poetry' },
};

function getModuleZone(module: CourseModule, index: number): { x: number; y: number; zone: string; description: string } {
  const title = module.title.toLowerCase();
  
  for (const [genre, position] of Object.entries(GENRE_ZONES)) {
    if (title.includes(genre)) {
      return position;
    }
  }
  
  // Spread defaults across different regions
  const defaults = [
    { x: 62, y: 48, zone: 'Highlands', description: 'Mountain traditions' },
    { x: 38, y: 42, zone: 'Coast', description: 'Coastal rhythms' },
    { x: 68, y: 58, zone: 'Altiplano', description: 'High plateau music' },
    { x: 72, y: 38, zone: 'Amazon', description: 'Jungle influences' },
  ];
  return defaults[index % defaults.length];
}

export function CourseMap({
  modules,
  completedLessons,
  totalLessonsPerModule,
  onModuleSelect,
  selectedModuleId,
  courseTitle,
  courseCountry
}: CourseMapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const getModuleProgress = (moduleId: string, lessons: any[] = []) => {
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    const total = lessons.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="fixed inset-0 bg-[hsl(220,30%,8%)] overflow-hidden">
      {/* SVG Map */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Ocean gradient */}
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(215, 50%, 12%)" />
            <stop offset="100%" stopColor="hsl(225, 60%, 8%)" />
          </linearGradient>
          
          {/* Neighboring countries - muted */}
          <linearGradient id="neighborGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(200, 15%, 18%)" />
            <stop offset="100%" stopColor="hsl(200, 15%, 14%)" />
          </linearGradient>
          
          {/* Peru regions */}
          <linearGradient id="costaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(35, 45%, 28%)" />
            <stop offset="100%" stopColor="hsl(30, 40%, 22%)" />
          </linearGradient>
          
          <linearGradient id="sierraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(25, 50%, 25%)" />
            <stop offset="100%" stopColor="hsl(20, 45%, 20%)" />
          </linearGradient>
          
          <linearGradient id="selvaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(145, 35%, 22%)" />
            <stop offset="100%" stopColor="hsl(150, 40%, 16%)" />
          </linearGradient>

          {/* Glow effect */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ocean */}
        <rect x="0" y="0" width="100" height="100" fill="url(#oceanGradient)" />

        {/* ECUADOR - North */}
        <path
          d="M 18 0 L 30 0 L 35 8 L 32 14 L 25 12 L 18 8 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 25%)"
          strokeWidth="0.3"
        />
        <text x="25" y="6" fill="hsl(200, 15%, 40%)" fontSize="2.5" textAnchor="middle">ECUADOR</text>

        {/* COLOMBIA - Northeast */}
        <path
          d="M 35 0 L 55 0 L 60 5 L 58 12 L 50 10 L 42 8 L 35 8 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 25%)"
          strokeWidth="0.3"
        />
        <text x="47" y="5" fill="hsl(200, 15%, 40%)" fontSize="2.5" textAnchor="middle">COLOMBIA</text>

        {/* BRAZIL - East */}
        <path
          d="M 60 5 L 100 5 L 100 70 L 80 75 L 75 65 L 78 50 L 80 35 L 75 20 L 68 12 L 58 12 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 25%)"
          strokeWidth="0.3"
        />
        <text x="88" y="40" fill="hsl(200, 15%, 40%)" fontSize="3" textAnchor="middle">BRAZIL</text>

        {/* BOLIVIA - Southeast */}
        <path
          d="M 68 58 L 80 55 L 80 75 L 72 80 L 62 78 L 58 70 L 64 62 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 25%)"
          strokeWidth="0.3"
        />
        <text x="72" y="68" fill="hsl(200, 15%, 40%)" fontSize="2.5" textAnchor="middle">BOLIVIA</text>

        {/* CHILE - South */}
        <path
          d="M 42 68 L 58 70 L 62 78 L 60 90 L 50 100 L 35 100 L 38 85 L 40 75 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 25%)"
          strokeWidth="0.3"
        />
        <text x="50" y="88" fill="hsl(200, 15%, 40%)" fontSize="2.5" textAnchor="middle">CHILE</text>

        {/* PERU - Main country with regions */}
        {/* Base Peru shape */}
        <path
          d="M 18 8 
             L 25 12 L 32 14 L 35 18 L 32 24 L 34 30 L 36 36 
             L 34 42 L 36 50 L 40 58 L 42 64 L 42 68 L 40 75 
             L 44 72 L 50 68 L 58 70 L 64 62 L 68 58 
             L 75 50 L 78 40 L 75 28 L 68 18 L 58 12 
             L 50 10 L 42 8 L 32 8 L 25 8 L 18 8 Z"
          fill="url(#sierraGradient)"
          stroke="hsl(35, 50%, 45%)"
          strokeWidth="0.5"
        />

        {/* Costa (coastal strip) */}
        <path
          d="M 18 8 
             L 25 12 L 32 14 L 35 18 L 32 24 L 34 30 L 36 36 
             L 34 42 L 36 50 L 40 58 L 42 64 L 42 68 L 40 75
             L 38 70 L 36 62 L 34 54 L 32 46 L 30 38 
             L 28 30 L 26 22 L 22 14 L 18 8 Z"
          fill="url(#costaGradient)"
          opacity="0.95"
        />

        {/* Selva (Amazon) */}
        <path
          d="M 50 10 L 58 12 L 68 18 L 75 28 L 78 40 L 75 50 
             L 68 58 L 64 62 L 58 58 L 55 48 L 54 38 L 52 28 L 50 18 L 50 10 Z"
          fill="url(#selvaGradient)"
          opacity="0.95"
        />

        {/* Andes line */}
        <path
          d="M 42 12 Q 48 25 52 40 Q 55 52 58 62"
          fill="none"
          stroke="hsl(30, 25%, 40%)"
          strokeWidth="0.4"
          strokeDasharray="2 1"
          opacity="0.6"
        />

        {/* Lake Titicaca */}
        <ellipse cx="66" cy="62" rx="3" ry="2" fill="hsl(210, 45%, 30%)" />
        <text x="66" y="66" fill="hsl(210, 35%, 50%)" fontSize="1.5" textAnchor="middle">L. Titicaca</text>

        {/* Major cities (subtle) */}
        <circle cx="36" cy="42" r="1" fill="hsl(45, 60%, 55%)" opacity="0.7" />
        <text x="36" y="40" fill="hsl(0, 0%, 70%)" fontSize="2" textAnchor="middle">Lima</text>
        
        <circle cx="60" cy="50" r="0.8" fill="hsl(45, 50%, 50%)" opacity="0.6" />
        <text x="60" y="48" fill="hsl(0, 0%, 60%)" fontSize="1.8" textAnchor="middle">Cusco</text>
        
        <circle cx="56" cy="60" r="0.6" fill="hsl(45, 50%, 50%)" opacity="0.5" />
        <text x="56" y="58" fill="hsl(0, 0%, 55%)" fontSize="1.6" textAnchor="middle">Arequipa</text>

        {/* Pacific Ocean label */}
        <text x="10" y="50" fill="hsl(210, 35%, 35%)" fontSize="3" fontStyle="italic" opacity="0.5">
          Pacific
        </text>
        <text x="8" y="54" fill="hsl(210, 35%, 35%)" fontSize="3" fontStyle="italic" opacity="0.5">
          Ocean
        </text>

        {/* Region labels within Peru */}
        <text x="28" y="45" fill="hsl(35, 35%, 50%)" fontSize="2" fontWeight="500" opacity="0.5">
          Costa
        </text>
        <text x="48" y="42" fill="hsl(25, 40%, 45%)" fontSize="2" fontWeight="500" opacity="0.5">
          Sierra
        </text>
        <text x="68" y="35" fill="hsl(145, 30%, 40%)" fontSize="2" fontWeight="500" opacity="0.5">
          Selva
        </text>
      </svg>

      {/* Module zone markers as overlay */}
      {modules.map((module, index) => {
        const zone = getModuleZone(module, index);
        const progress = getModuleProgress(module.id, module.lessons);
        const isHovered = hoveredModule === module.id;
        const isComplete = progress.percentage === 100;

        return (
          <motion.div
            key={module.id}
            className="absolute cursor-pointer"
            style={{ 
              top: `${zone.y}%`, 
              left: `${zone.x}%`,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.4, type: 'spring' }}
          >
            <motion.button
              onClick={() => onModuleSelect(module.id)}
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
              className="relative group"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Pulse ring for incomplete */}
              {!isComplete && (
                <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: '2s' }} />
              )}
              
              {/* Glow on hover */}
              <div className={cn(
                "absolute -inset-4 rounded-full blur-xl transition-opacity duration-300",
                isHovered ? "opacity-60" : "opacity-0",
                isComplete ? "bg-green-500/50" : "bg-primary/50"
              )} />

              {/* Main circle */}
              <div className={cn(
                "relative w-12 h-12 rounded-full flex items-center justify-center",
                "border-2 shadow-xl transition-all duration-300",
                "font-bold text-lg",
                isComplete
                  ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/50 text-white"
                  : "bg-gradient-to-br from-card via-card to-muted border-primary/50 text-foreground"
              )}>
                {isComplete ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}

                {/* Progress arc */}
                {!isComplete && progress.percentage > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary/20"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${progress.percentage * 1.38} 138`}
                      className="text-primary"
                    />
                  </svg>
                )}
              </div>
            </motion.button>

            {/* Hover tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className={cn(
                    "absolute z-30 pointer-events-none",
                    zone.x > 60 ? "right-full mr-4" : "left-full ml-4",
                    "top-1/2 -translate-y-1/2",
                    "w-56 p-4 rounded-2xl",
                    "bg-card/95 backdrop-blur-lg border border-border shadow-2xl"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {zone.zone}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground leading-tight">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {zone.description}
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            isComplete ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Course title overlay */}
      <motion.div 
        className="absolute bottom-8 left-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-white/90 tracking-tight">
          {courseTitle}
        </h1>
        <p className="text-lg text-white/50 mt-1">{courseCountry}</p>
      </motion.div>

      {/* Compass */}
      <motion.div 
        className="absolute top-8 right-8 w-14 h-14"
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 0.4, rotate: 0 }}
        transition={{ delay: 0.6 }}
      >
        <svg viewBox="0 0 56 56" className="text-white">
          <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M28 4 L30 24 L28 30 L26 24 Z" fill="currentColor" />
          <path d="M28 52 L26 32 L28 26 L30 32 Z" fill="currentColor" opacity="0.4" />
          <text x="28" y="12" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">N</text>
        </svg>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="absolute bottom-8 right-8 text-right"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-sm text-white/40">Click a region to begin</p>
      </motion.div>
    </div>
  );
}
