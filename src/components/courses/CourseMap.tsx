import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseModule } from '@/types/course';

interface CourseMapProps {
  modules: CourseModule[];
  completedLessons: Set<string>;
  totalLessonsPerModule: Map<string, number>;
  onModuleSelect: (moduleId: string) => void;
  selectedModuleId?: string;
}

// Peru's major cities/regions with coordinates on the map
const PERU_CITIES = [
  { name: 'Tumbes', x: 18, y: 8 },
  { name: 'Piura', x: 22, y: 14 },
  { name: 'Chiclayo', x: 26, y: 20 },
  { name: 'Trujillo', x: 30, y: 26 },
  { name: 'Lima', x: 32, y: 40, major: true },
  { name: 'Chincha', x: 34, y: 46 },
  { name: 'Ica', x: 36, y: 50 },
  { name: 'Nazca', x: 40, y: 56 },
  { name: 'Arequipa', x: 52, y: 62, major: true },
  { name: 'Tacna', x: 56, y: 72 },
  { name: 'Puno', x: 62, y: 64, major: true },
  { name: 'Cusco', x: 58, y: 52, major: true },
  { name: 'Ayacucho', x: 46, y: 48 },
  { name: 'Huancayo', x: 42, y: 40 },
  { name: 'Huaraz', x: 36, y: 30 },
  { name: 'Iquitos', x: 60, y: 16, major: true },
  { name: 'Pucallpa', x: 58, y: 32 },
  { name: 'Puerto Maldonado', x: 72, y: 48 },
];

// Map module titles/genres to geographic regions
const GENRE_POSITIONS: Record<string, { x: number; y: number; region: string }> = {
  'huayño': { x: 58, y: 52, region: 'Cusco' },      // Cusco highlands
  'sonqollay': { x: 46, y: 48, region: 'Ayacucho' }, // Central sierra
  'carnavalito': { x: 62, y: 64, region: 'Puno' },   // Southern highlands (Lake Titicaca)
  'waltz': { x: 32, y: 40, region: 'Lima' },         // Lima coast (Vals Criollo)
  'vals': { x: 32, y: 40, region: 'Lima' },          // Lima coast
  'festejo': { x: 34, y: 46, region: 'Chincha' },    // Afro-Peruvian coast
  'landó': { x: 34, y: 46, region: 'Chincha' },      // Afro-Peruvian coast
  'marinera': { x: 30, y: 26, region: 'Trujillo' },  // Northern coast
  'tondero': { x: 22, y: 14, region: 'Piura' },      // Far north coast
  'muliza': { x: 42, y: 40, region: 'Huancayo' },    // Central highlands
  'huaylas': { x: 36, y: 30, region: 'Huaraz' },     // Northern highlands
  'yaraví': { x: 52, y: 62, region: 'Arequipa' },    // Southern coast/highlands
};

function getModulePosition(module: CourseModule, index: number): { x: number; y: number; region: string } {
  const title = module.title.toLowerCase();
  
  for (const [genre, position] of Object.entries(GENRE_POSITIONS)) {
    if (title.includes(genre)) {
      return position;
    }
  }
  
  // Default positions spread across Peru if no genre match
  const defaults = [
    { x: 58, y: 52, region: 'Cusco' },
    { x: 32, y: 40, region: 'Lima' },
    { x: 62, y: 64, region: 'Puno' },
    { x: 52, y: 62, region: 'Arequipa' },
  ];
  return defaults[index % defaults.length];
}

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
    <div className="relative w-full aspect-[4/5] max-w-2xl mx-auto">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))' }}
      >
        <defs>
          {/* Gradient for the ocean */}
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 60%, 25%)" />
            <stop offset="100%" stopColor="hsl(220, 70%, 15%)" />
          </linearGradient>
          
          {/* Gradient for Costa (coastal region) */}
          <linearGradient id="costaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(35, 50%, 35%)" />
            <stop offset="100%" stopColor="hsl(30, 45%, 25%)" />
          </linearGradient>
          
          {/* Gradient for Sierra (highlands) */}
          <linearGradient id="sierraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(25, 55%, 30%)" />
            <stop offset="100%" stopColor="hsl(20, 50%, 22%)" />
          </linearGradient>
          
          {/* Gradient for Selva (jungle) */}
          <linearGradient id="selvaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(140, 40%, 25%)" />
            <stop offset="100%" stopColor="hsl(150, 45%, 18%)" />
          </linearGradient>

          {/* Glow filter for selected modules */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect x="0" y="0" width="100" height="100" fill="url(#oceanGradient)" />

        {/* Peru outline - simplified but recognizable shape */}
        <path
          d="M 18 6 
             L 25 8 L 28 12 L 26 16 L 28 20 L 30 24 L 32 28 
             L 34 34 L 32 38 L 34 44 L 36 50 L 40 56 
             L 44 60 L 52 64 L 56 72 L 58 76
             L 68 76 L 74 68 L 78 56 L 80 44 
             L 76 32 L 72 24 L 68 16 L 62 12 
             L 54 10 L 46 8 L 38 6 L 28 4 L 18 6 Z"
          fill="url(#sierraGradient)"
          stroke="hsl(30, 30%, 40%)"
          strokeWidth="0.5"
        />

        {/* Costa region (coastal strip) */}
        <path
          d="M 18 6 
             L 25 8 L 28 12 L 26 16 L 28 20 L 30 24 L 32 28 
             L 34 34 L 32 38 L 34 44 L 36 50 L 40 56 
             L 44 60 L 52 64 L 56 72 L 58 76
             L 54 74 L 48 62 L 42 54 L 38 48 L 36 42 
             L 34 36 L 32 30 L 30 26 L 28 22 L 26 18 
             L 24 14 L 22 10 L 18 6 Z"
          fill="url(#costaGradient)"
          opacity="0.9"
        />

        {/* Selva region (jungle - eastern) */}
        <path
          d="M 54 10 L 62 12 L 68 16 L 72 24 L 76 32 
             L 80 44 L 78 56 L 74 68 L 68 76
             L 66 70 L 64 60 L 62 50 L 60 40 
             L 58 32 L 56 24 L 54 16 L 54 10 Z"
          fill="url(#selvaGradient)"
          opacity="0.9"
        />

        {/* Andes mountain range indication */}
        <path
          d="M 40 10 Q 44 20 46 30 Q 48 40 52 50 Q 54 58 58 66"
          fill="none"
          stroke="hsl(30, 20%, 50%)"
          strokeWidth="0.3"
          strokeDasharray="2 1"
          opacity="0.5"
        />

        {/* Lake Titicaca */}
        <ellipse cx="64" cy="66" rx="4" ry="2.5" fill="hsl(210, 50%, 35%)" />
        
        {/* Pacific Ocean label */}
        <text x="12" y="45" fill="hsl(210, 40%, 50%)" fontSize="3" fontStyle="italic" opacity="0.7">
          Océano
        </text>
        <text x="10" y="48" fill="hsl(210, 40%, 50%)" fontSize="3" fontStyle="italic" opacity="0.7">
          Pacífico
        </text>

        {/* City markers */}
        {PERU_CITIES.map((city) => (
          <g key={city.name}>
            <circle 
              cx={city.x} 
              cy={city.y} 
              r={city.major ? 1 : 0.6} 
              fill={city.major ? "hsl(45, 70%, 60%)" : "hsl(0, 0%, 70%)"} 
              opacity={city.major ? 0.9 : 0.6}
            />
            <text 
              x={city.x + 1.5} 
              y={city.y + 0.5} 
              fill="hsl(0, 0%, 85%)" 
              fontSize={city.major ? 2.5 : 2}
              fontWeight={city.major ? "600" : "400"}
              opacity={city.major ? 0.9 : 0.6}
            >
              {city.name}
            </text>
          </g>
        ))}

        {/* Region labels */}
        <text x="28" y="42" fill="hsl(35, 30%, 60%)" fontSize="3" fontWeight="600" opacity="0.7">
          COSTA
        </text>
        <text x="46" y="38" fill="hsl(25, 35%, 55%)" fontSize="3" fontWeight="600" opacity="0.7">
          SIERRA
        </text>
        <text x="66" y="32" fill="hsl(140, 30%, 50%)" fontSize="3" fontWeight="600" opacity="0.7">
          SELVA
        </text>
      </svg>

      {/* Module markers as overlay */}
      {modules.map((module, index) => {
        const position = getModulePosition(module, index);
        const progress = getModuleProgress(module.id, module.lessons);
        const isSelected = selectedModuleId === module.id;
        const isHovered = hoveredModule === module.id;

        return (
          <motion.div
            key={module.id}
            className="absolute"
            style={{ 
              top: `${position.y}%`, 
              left: `${position.x}%`,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <motion.button
              onClick={() => onModuleSelect(module.id)}
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
              className="relative group cursor-pointer"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow ring */}
              <div className={cn(
                "absolute -inset-3 rounded-full transition-opacity duration-300",
                isSelected || isHovered ? "opacity-100" : "opacity-0",
                "bg-primary/30 blur-md"
              )} />

              {/* Main marker circle */}
              <div className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center",
                "border-2 transition-all duration-300 shadow-lg",
                "bg-gradient-to-br font-bold text-sm",
                isSelected 
                  ? "border-primary bg-primary text-primary-foreground scale-110" 
                  : "border-white/60 from-card to-card/80 text-foreground hover:border-primary/70"
              )}>
                {index + 1}
                
                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/20"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${progress.percentage * 1.13} 113`}
                    className={cn(
                      "transition-all duration-500",
                      progress.percentage === 100 ? "text-green-400" : "text-primary"
                    )}
                  />
                </svg>

                {/* Completion badge */}
                {progress.percentage === 100 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
            </motion.button>

            {/* Tooltip card */}
            <AnimatePresence>
              {(isHovered || isSelected) && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.9 }}
                  className={cn(
                    "absolute z-20",
                    position.x > 50 ? "right-full mr-3" : "left-full ml-3",
                    "top-1/2 -translate-y-1/2",
                    "w-48 p-3 rounded-xl",
                    "bg-card/95 backdrop-blur-md border border-border shadow-2xl"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground leading-tight truncate">
                        {module.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {position.region}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              progress.percentage === 100 ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
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

      {/* Title */}
      <div className="absolute bottom-4 left-4">
        <h2 className="text-2xl font-bold text-white/90 tracking-wider">PERÚ</h2>
        <p className="text-xs text-white/50 mt-0.5">Guitar Journey</p>
      </div>

      {/* Compass */}
      <div className="absolute top-4 right-4 w-10 h-10 opacity-50">
        <svg viewBox="0 0 48 48" className="text-white">
          <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M24 4 L26 22 L24 26 L22 22 Z" fill="currentColor" />
          <path d="M24 44 L22 26 L24 22 L26 26 Z" fill="currentColor" opacity="0.5" />
          <text x="24" y="10" textAnchor="middle" fontSize="6" fill="currentColor">N</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm rounded-lg p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[hsl(35,50%,35%)]" />
          <span className="text-muted-foreground">Costa</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[hsl(25,55%,30%)]" />
          <span className="text-muted-foreground">Sierra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[hsl(140,40%,25%)]" />
          <span className="text-muted-foreground">Selva</span>
        </div>
      </div>
    </div>
  );
}
