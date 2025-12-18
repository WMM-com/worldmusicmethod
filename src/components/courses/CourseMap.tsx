import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, CheckCircle2 } from 'lucide-react';
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

// Station positions along Peru's geography (normalized 0-100)
// Arranged as a metro line winding through the country
const STATION_POSITIONS = [
  { x: 28, y: 18, region: 'North Coast' },      // Piura area
  { x: 30, y: 28, region: 'Trujillo' },         // Northern coast
  { x: 32, y: 38, region: 'Lima' },             // Capital
  { x: 38, y: 46, region: 'Central Coast' },    // South of Lima
  { x: 44, y: 52, region: 'Ica' },              // Chincha/Festejo region
  { x: 50, y: 48, region: 'Ayacucho' },         // Central highlands
  { x: 54, y: 42, region: 'Huancayo' },         // Junín
  { x: 58, y: 50, region: 'Cusco' },            // Sacred Valley
  { x: 62, y: 58, region: 'Puno' },             // Lake Titicaca
  { x: 54, y: 62, region: 'Arequipa' },         // White City
  { x: 68, y: 32, region: 'Selva' },            // Amazon entrance
  { x: 72, y: 24, region: 'Iquitos' },          // Deep jungle
];

export function CourseMap({
  modules,
  completedLessons,
  totalLessonsPerModule,
  onModuleSelect,
  selectedModuleId,
  courseTitle,
  courseCountry
}: CourseMapProps) {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  const getModuleProgress = (moduleId: string, lessons: any[] = []) => {
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    const total = lessons.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Map modules to stations
  const stations = useMemo(() => {
    return modules.map((module, index) => {
      const pos = STATION_POSITIONS[index % STATION_POSITIONS.length];
      const progress = getModuleProgress(module.id, module.lessons);
      return {
        ...module,
        ...pos,
        index,
        progress,
        isComplete: progress.percentage === 100,
      };
    });
  }, [modules, completedLessons]);

  // Find current position (first incomplete module)
  const currentStationIndex = useMemo(() => {
    const idx = stations.findIndex(s => !s.isComplete);
    return idx === -1 ? stations.length - 1 : idx;
  }, [stations]);

  // Generate smooth metro line path through all stations
  const linePath = useMemo(() => {
    if (stations.length < 2) return '';
    
    const points = stations.map(s => ({ x: s.x, y: s.y }));
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Use quadratic bezier for smooth curves
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${midY} ${midX} ${midY}`;
      path += ` T ${curr.x} ${curr.y}`;
    }
    
    return path;
  }, [stations]);

  // Simpler path for animation
  const simpleLinePath = useMemo(() => {
    if (stations.length < 2) return '';
    return stations.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`).join(' ');
  }, [stations]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[hsl(220,25%,10%)] to-[hsl(220,30%,6%)] overflow-hidden">
      {/* SVG Map */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(215, 50%, 12%)" />
            <stop offset="100%" stopColor="hsl(225, 60%, 8%)" />
          </linearGradient>
          
          <linearGradient id="neighborGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(200, 15%, 16%)" />
            <stop offset="100%" stopColor="hsl(200, 15%, 12%)" />
          </linearGradient>
          
          <linearGradient id="peruGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(35, 35%, 22%)" />
            <stop offset="100%" stopColor="hsl(30, 30%, 16%)" />
          </linearGradient>

          <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.3)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="stationGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect x="0" y="0" width="100" height="100" fill="url(#oceanGradient)" />

        {/* Neighboring countries - subtle shapes */}
        {/* Ecuador */}
        <path
          d="M 18 0 L 32 0 L 36 10 L 30 16 L 22 12 L 18 6 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 22%)"
          strokeWidth="0.2"
        />
        <text x="25" y="6" fill="hsl(200, 15%, 35%)" fontSize="2" textAnchor="middle" fontWeight="300">Ecuador</text>

        {/* Colombia */}
        <path
          d="M 36 0 L 58 0 L 62 8 L 56 14 L 46 12 L 36 10 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 22%)"
          strokeWidth="0.2"
        />
        <text x="48" y="6" fill="hsl(200, 15%, 35%)" fontSize="2" textAnchor="middle" fontWeight="300">Colombia</text>

        {/* Brazil */}
        <path
          d="M 62 8 L 100 8 L 100 72 L 82 76 L 76 66 L 78 50 L 80 34 L 74 18 L 66 12 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 22%)"
          strokeWidth="0.2"
        />
        <text x="88" y="42" fill="hsl(200, 15%, 35%)" fontSize="2.5" textAnchor="middle" fontWeight="300">Brazil</text>

        {/* Bolivia */}
        <path
          d="M 66 56 L 80 52 L 82 76 L 74 82 L 64 78 L 60 68 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 22%)"
          strokeWidth="0.2"
        />
        <text x="72" y="68" fill="hsl(200, 15%, 35%)" fontSize="2" textAnchor="middle" fontWeight="300">Bolivia</text>

        {/* Chile */}
        <path
          d="M 44 70 L 60 68 L 64 78 L 58 92 L 48 100 L 36 100 L 40 86 L 42 78 Z"
          fill="url(#neighborGradient)"
          stroke="hsl(200, 20%, 22%)"
          strokeWidth="0.2"
        />
        <text x="50" y="90" fill="hsl(200, 15%, 35%)" fontSize="2" textAnchor="middle" fontWeight="300">Chile</text>

        {/* PERU - Main country */}
        <path
          d="M 18 6 L 22 12 L 30 16 L 36 20 L 32 28 L 34 36 L 32 44 
             L 36 54 L 42 62 L 44 70 L 42 78 
             L 48 74 L 56 70 L 60 68 L 66 56 
             L 76 48 L 78 36 L 74 24 L 66 14 
             L 56 10 L 46 8 L 36 8 L 22 6 Z"
          fill="url(#peruGradient)"
          stroke="hsl(35, 40%, 35%)"
          strokeWidth="0.4"
        />

        {/* Lake Titicaca */}
        <ellipse cx="64" cy="60" rx="3" ry="2" fill="hsl(210, 40%, 25%)" opacity="0.7" />

        {/* Pacific Ocean label */}
        <text x="12" y="50" fill="hsl(210, 30%, 30%)" fontSize="2.5" fontStyle="italic" opacity="0.4">
          Pacific
        </text>
        <text x="10" y="54" fill="hsl(210, 30%, 30%)" fontSize="2.5" fontStyle="italic" opacity="0.4">
          Ocean
        </text>

        {/* METRO TRACK - Background (unvisited) */}
        <motion.path
          d={simpleLinePath}
          fill="none"
          stroke="hsl(0, 0%, 30%)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.5 1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* METRO TRACK - Completed portion */}
        <motion.path
          d={simpleLinePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ 
            pathLength: stations.length > 1 
              ? (currentStationIndex + 1) / stations.length 
              : 0 
          }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />

        {/* Station markers */}
        {stations.map((station, idx) => {
          const isHovered = hoveredStation === station.id;
          const isCurrent = idx === currentStationIndex;
          const isVisited = idx <= currentStationIndex;
          
          return (
            <g key={station.id}>
              {/* Station outer ring */}
              <motion.circle
                cx={station.x}
                cy={station.y}
                r={isCurrent ? 3 : 2.2}
                fill={station.isComplete 
                  ? 'hsl(142, 70%, 45%)' 
                  : isVisited 
                    ? 'hsl(var(--background))' 
                    : 'hsl(0, 0%, 20%)'
                }
                stroke={station.isComplete 
                  ? 'hsl(142, 60%, 55%)' 
                  : isVisited 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(0, 0%, 35%)'
                }
                strokeWidth={isCurrent ? 0.6 : 0.4}
                className={isVisited ? 'cursor-pointer' : 'cursor-not-allowed'}
                onClick={() => isVisited && onModuleSelect(station.id)}
                onMouseEnter={() => setHoveredStation(station.id)}
                onMouseLeave={() => setHoveredStation(null)}
                initial={{ scale: 0 }}
                animate={{ scale: isHovered ? 1.3 : 1 }}
                transition={{ 
                  scale: { type: 'spring', stiffness: 400 },
                  default: { delay: 0.3 + idx * 0.08 }
                }}
                filter={isHovered || isCurrent ? 'url(#stationGlow)' : undefined}
              />

              {/* Station number or checkmark */}
              <motion.text
                x={station.x}
                y={station.y + 0.6}
                fontSize={station.isComplete ? 2.5 : 2}
                fill={station.isComplete 
                  ? 'hsl(142, 90%, 95%)' 
                  : isVisited 
                    ? 'hsl(var(--foreground))' 
                    : 'hsl(0, 0%, 50%)'
                }
                textAnchor="middle"
                fontWeight="600"
                className="pointer-events-none select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + idx * 0.08 }}
              >
                {station.isComplete ? '✓' : idx + 1}
              </motion.text>

              {/* Station label */}
              <motion.text
                x={station.x}
                y={station.y + 5.5}
                fontSize="1.8"
                fill={isVisited ? 'hsl(0, 0%, 85%)' : 'hsl(0, 0%, 45%)'}
                textAnchor="middle"
                className="pointer-events-none select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                transition={{ delay: 0.6 + idx * 0.08 }}
              >
                {station.title.length > 14 ? station.title.slice(0, 12) + '…' : station.title}
              </motion.text>

              {/* Progress indicator for current/in-progress */}
              {isVisited && !station.isComplete && station.progress.total > 0 && (
                <text
                  x={station.x}
                  y={station.y + 7.5}
                  fontSize="1.4"
                  fill="hsl(var(--primary))"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {station.progress.completed}/{station.progress.total}
                </text>
              )}
            </g>
          );
        })}

        {/* User avatar (train) at current station */}
        {stations[currentStationIndex] && (
          <motion.g
            initial={{ 
              x: stations[0]?.x || 0, 
              y: (stations[0]?.y || 0) - 5 
            }}
            animate={{ 
              x: stations[currentStationIndex].x, 
              y: stations[currentStationIndex].y - 5 
            }}
            transition={{ 
              duration: 0.8, 
              type: 'spring',
              stiffness: 100,
              delay: 1.5 
            }}
          >
            <motion.circle
              cx={0}
              cy={0}
              r={2.5}
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <text
              x={0}
              y={0.7}
              fontSize="2.2"
              fill="white"
              textAnchor="middle"
              className="pointer-events-none"
            >
              🚂
            </text>
          </motion.g>
        )}
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredStation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            {(() => {
              const station = stations.find(s => s.id === hoveredStation);
              if (!station) return null;
              const isVisited = station.index <= currentStationIndex;
              
              return (
                <div className={cn(
                  "px-5 py-3 rounded-xl shadow-2xl border",
                  "bg-card/95 backdrop-blur-lg border-border",
                  "min-w-[200px] text-center"
                )}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Station {station.index + 1} • {station.region}
                  </p>
                  <h3 className="font-bold text-foreground">{station.title}</h3>
                  
                  {station.progress.total > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          className={cn(
                            "h-full rounded-full",
                            station.isComplete ? "bg-green-500" : "bg-primary"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${station.progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {station.progress.completed}/{station.progress.total}
                      </span>
                    </div>
                  )}
                  
                  {!isVisited && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Complete previous stations to unlock
                    </p>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course title */}
      <motion.div 
        className="fixed bottom-8 left-8 z-40"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white/90 tracking-tight">
          {courseTitle}
        </h1>
        <p className="text-lg text-white/50">{courseCountry}</p>
      </motion.div>

      {/* Legend */}
      <motion.div 
        className="fixed bottom-8 right-8 z-40 flex items-center gap-5 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 border border-green-400" />
          <span className="text-white/60">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
          <span className="text-white/60">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neutral-700 border border-neutral-600" />
          <span className="text-white/60">Locked</span>
        </div>
      </motion.div>

      {/* Journey progress */}
      <motion.div
        className="fixed top-20 left-8 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="text-sm text-white/50">
          <span className="text-white font-medium">{stations.filter(s => s.isComplete).length}</span>
          <span> of </span>
          <span className="text-white font-medium">{stations.length}</span>
          <span> stations visited</span>
        </div>
      </motion.div>
    </div>
  );
}
