import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSavePracticeScore } from '@/hooks/useCourses';
import { toast } from 'sonner';

interface RhythmTrainerProps {
  courseId?: string;
  onClose: () => void;
}

interface Beat {
  id: number;
  time: number;
  hit: boolean | null;
}

const PATTERNS = [
  { name: 'Huayño Basic', bpm: 100, pattern: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
  { name: 'Festejo', bpm: 120, pattern: [0, 0.33, 0.66, 1, 1.5, 2, 2.33, 2.66, 3, 3.5] },
  { name: 'Landó', bpm: 80, pattern: [0, 0.75, 1.5, 2, 2.75, 3.5] },
  { name: 'Waltz', bpm: 90, pattern: [0, 1, 2] }
];

export function RhythmTrainer({ courseId, onClose }: RhythmTrainerProps) {
  const [currentPattern, setCurrentPattern] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [score, setScore] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [round, setRound] = useState(1);
  const [showResults, setShowResults] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const savePracticeScore = useSavePracticeScore();
  const pattern = PATTERNS[currentPattern];
  const beatDuration = 60 / pattern.bpm;

  const playClick = useCallback((frequency: number = 800) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  const startRound = useCallback(() => {
    const newBeats = pattern.pattern.map((time, i) => ({
      id: i,
      time: time * beatDuration * 1000,
      hit: null
    }));
    
    setBeats(newBeats);
    setCurrentBeat(-1);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    
    // Play the pattern first
    let beatIndex = 0;
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      
      if (beatIndex < newBeats.length && elapsed >= newBeats[beatIndex].time) {
        playClick();
        setCurrentBeat(beatIndex);
        beatIndex++;
      }
      
      // End after full measure
      if (elapsed > 4 * beatDuration * 1000) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // Short pause then start user turn
        setTimeout(() => {
          startTimeRef.current = Date.now();
          setCurrentBeat(-1);
          
          // User's turn to tap
          intervalRef.current = window.setInterval(() => {
            const userElapsed = Date.now() - startTimeRef.current;
            if (userElapsed > 4 * beatDuration * 1000 + 500) {
              endRound();
            }
          }, 50);
        }, 1000);
      }
    }, 10);
  }, [pattern, beatDuration, playClick]);

  const handleTap = useCallback(() => {
    if (!isPlaying) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    playClick(600);
    
    // Find closest beat
    let closestBeat: Beat | null = null;
    let closestDiff = Infinity;
    
    beats.forEach(beat => {
      if (beat.hit !== null) return;
      const diff = Math.abs(elapsed - beat.time);
      if (diff < closestDiff && diff < 200) { // 200ms tolerance
        closestDiff = diff;
        closestBeat = beat;
      }
    });
    
    if (closestBeat) {
      const accuracy = 1 - (closestDiff / 200);
      setBeats(prev => prev.map(b => 
        b.id === closestBeat!.id ? { ...b, hit: true } : b
      ));
      setScore(prev => prev + Math.round(accuracy * 10));
      setTotalBeats(prev => prev + 10);
    }
  }, [isPlaying, beats, playClick]);

  const endRound = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    
    // Mark missed beats
    setBeats(prev => prev.map(b => b.hit === null ? { ...b, hit: false } : b));
    
    if (round >= 3) {
      setShowResults(true);
    }
  }, [round]);

  const nextRound = () => {
    setRound(prev => prev + 1);
    startRound();
  };

  const handleSaveScore = async () => {
    if (!courseId) {
      onClose();
      return;
    }
    
    try {
      await savePracticeScore.mutateAsync({
        course_id: courseId,
        practice_type: 'rhythm',
        score,
        max_score: totalBeats || 30,
        difficulty: 'medium',
        metadata: { pattern: pattern.name, rounds: round }
      });
      toast.success('Score saved!');
      onClose();
    } catch {
      toast.error('Failed to save score');
    }
  };

  const reset = () => {
    setScore(0);
    setTotalBeats(0);
    setRound(1);
    setShowResults(false);
    setBeats([]);
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Rhythm Trainer</h2>
          <p className="text-sm text-muted-foreground">{pattern.name} • {pattern.bpm} BPM</p>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Score: {score}</span>
        </div>
      </div>

      {/* Pattern selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {PATTERNS.map((p, i) => (
          <Button
            key={p.name}
            variant={currentPattern === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setCurrentPattern(i);
              reset();
            }}
            disabled={isPlaying}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {/* Beat visualization */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 h-20">
          {beats.map((beat, i) => (
            <motion.div
              key={beat.id}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-colors",
                currentBeat === i && "scale-125",
                beat.hit === true && "bg-green-500 border-green-500",
                beat.hit === false && "bg-red-500/50 border-red-500",
                beat.hit === null && "bg-muted border-border"
              )}
              animate={currentBeat === i ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Round {round}/3
          </p>
          <Progress value={(round / 3) * 100} className="mt-2" />
        </div>
      </div>

      {/* Tap area */}
      {isPlaying && !showResults && (
        <motion.button
          onClick={handleTap}
          className="w-full h-32 bg-primary/10 hover:bg-primary/20 rounded-xl border-2 border-dashed border-primary/50 flex items-center justify-center transition-colors"
          whileTap={{ scale: 0.95, backgroundColor: 'hsl(var(--primary) / 0.3)' }}
        >
          <span className="text-lg font-medium text-primary">TAP HERE</span>
        </motion.button>
      )}

      {/* Controls */}
      {!showResults && (
        <div className="flex justify-center gap-3 mt-6">
          {!isPlaying ? (
            <Button onClick={startRound} size="lg">
              <Play className="w-4 h-4 mr-2" />
              {round === 1 ? 'Start' : 'Continue'}
            </Button>
          ) : (
            <Button variant="outline" onClick={endRound}>
              <Pause className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Round Complete!</h3>
            <p className="text-lg text-muted-foreground mb-4">
              Score: {score} / {totalBeats}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Accuracy: {totalBeats > 0 ? Math.round((score / totalBeats) * 100) : 0}%
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={reset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={handleSaveScore}>
                Save & Exit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
