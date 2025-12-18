import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mountain, Music, Waves, Sun, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseModule, PeruRegion, PERU_REGIONS } from '@/types/course';

interface CourseMapProps {
  modules: CourseModule[];
  completedLessons: Set<string>;
  totalLessonsPerModule: Map<string, number>;
  onModuleSelect: (moduleId: string) => void;
  selectedModuleId?: string;
}

const REGION_ICONS: Record<string, React.ElementType> = {
  highlands: Mountain,
  valleys: Music,
  coast: Sun,
  pacific: Waves
};

const REGION_POSITIONS = [
  { top: '15%', left: '55%', rotate: -5 },
  { top: '35%', left: '40%', rotate: 3 },
  { top: '55%', left: '60%', rotate: -2 },
  { top: '75%', left: '45%', rotate: 4 }
];

export function CourseMap({
  modules,
  completedLessons,
  totalLessonsPerModule,
  onModuleSelect,
  selectedModuleId
}: CourseMapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const getModuleProgress = (moduleId: string, lessons: any[] = []) => {
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    const total = lessons.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="relative w-full aspect-[3/4] max-w-2xl mx-auto">
      {/* Artistic map background */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden">
        {/* Base gradient - Peru terrain */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950 via-emerald-950 to-slate-900" />
        
        {/* Mountain texture overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 600">
          <defs>
            <pattern id="mountains" patternUnits="userSpaceOnUse" width="100" height="50">
              <path d="M0 50 L25 20 L50 50 L75 15 L100 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mountains)" />
        </svg>

        {/* Decorative lines connecting regions */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600">
          <path
            d="M 220 100 Q 180 180 160 220 Q 140 280 240 340 Q 280 400 180 460"
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="8 4"
            className="opacity-40"
          />
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Region markers */}
      {modules.map((module, index) => {
        const position = REGION_POSITIONS[index] || REGION_POSITIONS[0];
        const progress = getModuleProgress(module.id, module.lessons);
        const Icon = REGION_ICONS[module.icon_type] || Mountain;
        const isSelected = selectedModuleId === module.id;
        const isHovered = hoveredModule === module.id;

        return (
          <motion.div
            key={module.id}
            className="absolute"
            style={{ top: position.top, left: position.left }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15, duration: 0.4 }}
          >
            <motion.button
              onClick={() => onModuleSelect(module.id)}
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
              className={cn(
                "relative group cursor-pointer",
                "transform transition-transform duration-300"
              )}
              style={{ rotate: `${position.rotate}deg` }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow effect */}
              <div className={cn(
                "absolute -inset-4 rounded-full blur-xl transition-opacity duration-300",
                isSelected || isHovered ? "opacity-60" : "opacity-0",
                module.color_theme === 'earth' && "bg-amber-500/50",
                module.color_theme === 'forest' && "bg-emerald-500/50",
                module.color_theme === 'ocean' && "bg-blue-500/50",
                module.color_theme === 'fire' && "bg-orange-500/50"
              )} />

              {/* Main marker */}
              <div className={cn(
                "relative w-20 h-20 rounded-2xl flex items-center justify-center",
                "border-2 transition-all duration-300",
                "bg-gradient-to-br shadow-2xl",
                isSelected ? "border-white scale-110" : "border-white/30",
                module.color_theme === 'earth' && "from-amber-800 to-amber-950",
                module.color_theme === 'forest' && "from-emerald-700 to-emerald-950",
                module.color_theme === 'ocean' && "from-slate-600 to-slate-900",
                module.color_theme === 'fire' && "from-orange-700 to-red-950"
              )}>
                <Icon className="w-8 h-8 text-white/90" />
                
                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-white/20"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${progress.percentage * 2.26} 226`}
                    className="text-white transition-all duration-500"
                  />
                </svg>

                {/* Completion badge */}
                {progress.percentage === 100 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Module number */}
              <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-background rounded-full border-2 border-border flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
            </motion.button>

            {/* Tooltip card */}
            <AnimatePresence>
              {(isHovered || isSelected) && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className={cn(
                    "absolute top-full mt-4 left-1/2 -translate-x-1/2 z-10",
                    "w-56 p-4 rounded-xl",
                    "bg-card/95 backdrop-blur-md border border-border shadow-2xl"
                  )}
                  style={{ rotate: `${-position.rotate}deg` }}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {module.title}
                      </h3>
                      {module.region_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {module.region_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {progress.completed}/{progress.total}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Country label */}
      <div className="absolute bottom-6 left-6">
        <h2 className="text-3xl font-bold text-white/90 tracking-wider">PERÚ</h2>
        <p className="text-sm text-white/50 mt-1">Guitar Journey</p>
      </div>

      {/* Compass decoration */}
      <div className="absolute top-6 right-6 w-12 h-12 opacity-40">
        <svg viewBox="0 0 48 48" className="text-white">
          <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M24 4 L26 22 L24 26 L22 22 Z" fill="currentColor" />
          <path d="M24 44 L22 26 L24 22 L26 26 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
