import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSavePracticeScore } from '@/hooks/useCourses';
import { toast } from 'sonner';

interface EarTrainerProps {
  courseId?: string;
  onClose: () => void;
}

const INTERVALS = [
  { name: 'Minor 2nd', semitones: 1 },
  { name: 'Major 2nd', semitones: 2 },
  { name: 'Minor 3rd', semitones: 3 },
  { name: 'Major 3rd', semitones: 4 },
  { name: 'Perfect 4th', semitones: 5 },
  { name: 'Tritone', semitones: 6 },
  { name: 'Perfect 5th', semitones: 7 },
  { name: 'Minor 6th', semitones: 8 },
  { name: 'Major 6th', semitones: 9 },
  { name: 'Minor 7th', semitones: 10 },
  { name: 'Major 7th', semitones: 11 },
  { name: 'Octave', semitones: 12 }
];

// Simplified set for beginners
const BEGINNER_INTERVALS = [0, 2, 3, 4, 6, 11]; // m2, m3, M3, P5, Octave

export function EarTrainer({ courseId, onClose }: EarTrainerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctInterval, setCorrectInterval] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const savePracticeScore = useSavePracticeScore();
  
  const totalQuestions = 5;
  const activeIntervals = BEGINNER_INTERVALS.map(i => INTERVALS[i]);

  const playNote = useCallback((frequency: number, duration: number = 0.5) => {
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
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const frequencyFromSemitones = (baseFreq: number, semitones: number) => {
    return baseFreq * Math.pow(2, semitones / 12);
  };

  const playInterval = useCallback((semitones: number) => {
    const baseFreq = 261.63; // Middle C
    const secondFreq = frequencyFromSemitones(baseFreq, semitones);
    
    playNote(baseFreq, 0.5);
    setTimeout(() => playNote(secondFreq, 0.5), 600);
  }, [playNote]);

  const generateQuestion = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * activeIntervals.length);
    const interval = activeIntervals[randomIndex];
    setCorrectInterval(INTERVALS.indexOf(interval));
    setSelectedAnswer(null);
    setShowResult(false);
    setHasPlayed(false);
  }, [activeIntervals]);

  const startGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setGameComplete(false);
    generateQuestion();
  };

  const handlePlaySound = () => {
    if (correctInterval !== null) {
      playInterval(INTERVALS[correctInterval].semitones);
      setHasPlayed(true);
    }
  };

  const handleAnswer = (intervalIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(intervalIndex);
    setShowResult(true);
    
    if (intervalIndex === correctInterval) {
      setScore(prev => prev + 1);
    }
    
    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestion + 1 >= totalQuestions) {
        setGameComplete(true);
      } else {
        setCurrentQuestion(prev => prev + 1);
        generateQuestion();
      }
    }, 1500);
  };

  const handleSaveScore = async () => {
    if (!courseId) {
      onClose();
      return;
    }
    
    try {
      await savePracticeScore.mutateAsync({
        course_id: courseId,
        practice_type: 'ear_training',
        score: score * 20, // Out of 100
        max_score: 100,
        difficulty: 'medium',
        metadata: { type: 'intervals', questions: totalQuestions }
      });
      toast.success('Score saved!');
      onClose();
    } catch {
      toast.error('Failed to save score');
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Ear Training</h2>
          <p className="text-sm text-muted-foreground">Identify the interval</p>
        </div>
        <div className="text-right">
          <span className="font-semibold">Score: {score}/{totalQuestions}</span>
        </div>
      </div>

      {/* Progress */}
      {!gameComplete && correctInterval !== null && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1}</span>
            <span>{totalQuestions} total</span>
          </div>
          <Progress value={((currentQuestion + 1) / totalQuestions) * 100} />
        </div>
      )}

      {/* Start screen */}
      {correctInterval === null && !gameComplete && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Interval Recognition</h3>
          <p className="text-muted-foreground mb-6">
            Listen to two notes and identify the interval between them.
          </p>
          <Button onClick={startGame} size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </div>
      )}

      {/* Question */}
      {correctInterval !== null && !gameComplete && (
        <>
          {/* Play button */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={handlePlaySound}
              size="lg"
              variant={hasPlayed ? 'outline' : 'default'}
              className="h-20 w-20 rounded-full"
            >
              <Play className="w-8 h-8" />
            </Button>
          </div>

          {/* Answer options */}
          <div className="grid grid-cols-2 gap-3">
            {activeIntervals.map((interval, i) => {
              const intervalIndex = INTERVALS.indexOf(interval);
              const isCorrect = intervalIndex === correctInterval;
              const isSelected = intervalIndex === selectedAnswer;
              
              return (
                <motion.button
                  key={interval.name}
                  onClick={() => handleAnswer(intervalIndex)}
                  disabled={showResult || !hasPlayed}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    "disabled:opacity-50",
                    !showResult && "hover:border-primary/50 hover:bg-muted/50",
                    showResult && isCorrect && "bg-green-500/20 border-green-500",
                    showResult && isSelected && !isCorrect && "bg-red-500/20 border-red-500",
                    !showResult && !hasPlayed && "opacity-50",
                    !showResult && hasPlayed && "border-border"
                  )}
                  whileHover={!showResult && hasPlayed ? { scale: 1.02 } : {}}
                  whileTap={!showResult && hasPlayed ? { scale: 0.98 } : {}}
                >
                  <p className="font-medium">{interval.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {interval.semitones} semitone{interval.semitones !== 1 ? 's' : ''}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {!hasPlayed && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Press play to hear the interval
            </p>
          )}
        </>
      )}

      {/* Results */}
      <AnimatePresence>
        {gameComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Training Complete!</h3>
            <p className="text-lg text-muted-foreground mb-4">
              You got {score} out of {totalQuestions} correct
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Accuracy: {Math.round((score / totalQuestions) * 100)}%
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={startGame} variant="outline">
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
