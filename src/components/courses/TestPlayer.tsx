import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Volume2,
  ChevronRight,
  Trophy,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmitTestAttempt, useUserTestAttempt } from '@/hooks/useTests';
import type { LessonTestWithQuestions, QuestionResult, TestQuestionWithAnswers } from '@/types/test';
import { toast } from 'sonner';

interface TestPlayerProps {
  test: LessonTestWithQuestions;
  onComplete?: () => void;
}

interface AnswerState {
  selectedAnswerId: string | null;
  attempts: number;
  correct: boolean;
  pointsEarned: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function TestPlayer({ test, onComplete }: TestPlayerProps) {
  const { data: previousAttempt } = useUserTestAttempt(test.id);
  const submitAttempt = useSubmitTestAttempt();
  
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<TestQuestionWithAnswers[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentQuestion = questionOrder[currentIndex];
  const totalQuestions = test.questions.length;
  const answeredCount = Object.values(answers).filter(a => a.correct).length;
  
  // Initialize or reset the test
  const initializeTest = useCallback(() => {
    const ordered = test.randomize_questions 
      ? shuffleArray(test.questions) 
      : test.questions;
    setQuestionOrder(ordered);
    setAnswers({});
    setCurrentIndex(0);
    setCompleted(false);
    setShowFeedback(false);
    setHasAutoPlayed(false);
  }, [test]);
  
  // Start the test
  const handleStart = () => {
    initializeTest();
    setStarted(true);
  };
  
  // Restart the test
  const handleRestart = () => {
    initializeTest();
    setStarted(true);
  };
  
  // Auto-play audio when question changes
  useEffect(() => {
    if (started && currentQuestion?.audio_url && !hasAutoPlayed) {
      const audio = audioRef.current;
      if (audio) {
        // Reset and load the new audio
        audio.pause();
        audio.src = currentQuestion.audio_url;
        audio.load();
        
        audio.play().then(() => {
          setIsPlaying(true);
          setHasAutoPlayed(true);
        }).catch((err) => {
          console.log('Autoplay blocked:', err);
          // Autoplay blocked, user will need to click
        });
      }
    }
  }, [currentIndex, started, currentQuestion, hasAutoPlayed]);
  
  // Handle audio play/pause
  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio || !currentQuestion?.audio_url) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Ensure src is set
      if (!audio.src || audio.src !== currentQuestion.audio_url) {
        audio.src = currentQuestion.audio_url;
        audio.load();
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio play failed:', err);
      });
    }
  };
  
  // Handle answer selection
  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion) return;
    
    const currentState = answers[currentQuestion.id] || { 
      selectedAnswerId: null, 
      attempts: 0, 
      correct: false,
      pointsEarned: 0
    };
    
    // Already got it right, don't allow changes
    if (currentState.correct) return;
    
    const selectedAnswer = currentQuestion.answers.find(a => a.id === answerId);
    const isCorrect = selectedAnswer?.is_correct || false;
    const newAttempts = currentState.attempts + 1;
    
    // Calculate points: 1 for first try correct, 0.5 for second try correct, 0 otherwise
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = newAttempts === 1 ? currentQuestion.points : currentQuestion.points * 0.5;
    }
    
    // Allow only one retry for half points
    const canRetry = !isCorrect && newAttempts < 2 && currentQuestion.answers.length > 2;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        selectedAnswerId: answerId,
        attempts: newAttempts,
        correct: isCorrect,
        pointsEarned: isCorrect ? pointsEarned : prev[currentQuestion.id]?.pointsEarned || 0
      }
    }));
    
    setShowFeedback(true);
    
    // Auto-advance after 2 seconds on correct answer
    if (isCorrect) {
      setTimeout(() => {
        handleNext();
      }, 2000);
    } else if (canRetry) {
      // If wrong and can retry, allow selection again after brief feedback
      setTimeout(() => {
        setShowFeedback(false);
      }, 1000);
    }
  };
  
  // Move to next question
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowFeedback(false);
      setHasAutoPlayed(false);
      setIsPlaying(false);
    } else {
      // Complete the test
      handleComplete();
    }
  };
  
  // Calculate and submit final score
  const handleComplete = async () => {
    const results: QuestionResult[] = questionOrder.map(q => {
      const answer = answers[q.id] || { correct: false, attempts: 0, pointsEarned: 0 };
      return {
        question_id: q.id,
        correct: answer.correct,
        attempts: answer.attempts,
        points_earned: answer.pointsEarned
      };
    });
    
    const score = results.reduce((sum, r) => sum + r.points_earned, 0);
    const maxScore = questionOrder.reduce((sum, q) => sum + q.points, 0);
    
    try {
      await submitAttempt.mutateAsync({
        testId: test.id,
        score,
        maxScore,
        questionResults: results
      });
      setCompleted(true);
      toast.success('Test completed!');
    } catch (error) {
      toast.error('Failed to save test results');
    }
  };
  
  // Calculate current progress
  const score = Object.values(answers).reduce((sum, a) => sum + a.pointsEarned, 0);
  const maxScore = questionOrder.reduce((sum, q) => sum + q.points, 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percentage >= test.passing_score;
  
  // Pre-test screen
  if (!started) {
    return (
      <Card className="max-w-2xl mx-auto bg-black/60 border-white/10 backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center bg-black/80 border-b border-white/10">
          <CardTitle className="text-2xl text-white">{test.title}</CardTitle>
          {test.description && (
            <p className="text-white/60 mt-2">{test.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6 bg-black/40">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-black/50 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
              <div className="text-sm text-white/50">Questions</div>
            </div>
            <div className="p-4 bg-black/50 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-primary">{test.passing_score}%</div>
              <div className="text-sm text-white/50">To Pass</div>
            </div>
          </div>
          
          {previousAttempt && (
            <div className="p-4 bg-primary/20 rounded-lg text-center border border-primary/40">
              <p className="text-sm text-white/60">Your best score</p>
              <p className="text-xl font-bold text-primary">
                {Math.round(previousAttempt.percentage)}%
              </p>
            </div>
          )}
          
          <div className="text-sm text-white/70 space-y-2 bg-black/50 p-4 rounded-lg border border-white/10">
            <p>• Listen to each audio clip and select the correct answer</p>
            <p>• You can replay the audio as many times as you like</p>
            <p>• Wrong answer? Get one more try for half points</p>
            <p>• Questions are randomized each attempt</p>
          </div>
          
          <Button onClick={handleStart} className="w-full bg-primary hover:bg-primary/90" size="lg">
            Start Test
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Completed screen
  if (completed) {
    return (
      <Card className="max-w-2xl mx-auto bg-black/60 border-white/10 backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center bg-black/80 border-b border-white/10 py-8">
          <div className={cn(
            "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4",
            passed 
              ? "bg-gradient-to-br from-green-500/30 to-green-600/10 border-2 border-green-500/50" 
              : "bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-500/50"
          )}>
            <Trophy className={cn(
              "w-12 h-12",
              passed ? "text-green-400" : "text-amber-400"
            )} />
          </div>
          <CardTitle className="text-2xl text-white">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </CardTitle>
          <p className="text-white/60 mt-2">
            {passed 
              ? 'You passed the test!'
              : `You need ${test.passing_score}% to pass. Keep trying!`}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 bg-black/40">
          <div className="text-center py-4">
            <div className={cn(
              "text-6xl font-bold mb-2",
              passed ? "text-green-400" : "text-amber-400"
            )}>
              {percentage}%
            </div>
            <p className="text-white/50">
              {score} / {maxScore} points
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {Object.values(answers).filter(a => a.correct && a.attempts === 1).length}
              </div>
              <div className="text-white/50">Correct (1st try)</div>
            </div>
            <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-lg">
              <div className="text-2xl font-bold text-amber-400">
                {Object.values(answers).filter(a => a.correct && a.attempts > 1).length}
              </div>
              <div className="text-white/50">Correct (2nd try)</div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onComplete} className="flex-1 bg-primary hover:bg-primary/90">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Question screen
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const canProceed = currentAnswer?.correct || (currentAnswer?.attempts || 0) >= 2;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  
  // Group answers into columns for better layout
  const getAnswerColumns = (answerCount: number) => {
    if (answerCount <= 4) return 1;
    if (answerCount <= 8) return 2;
    return 3;
  };
  
  const columns = currentQuestion ? getAnswerColumns(currentQuestion.answers.length) : 1;
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      
      {/* Progress bar */}
      <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/10">
        <div className="flex justify-between text-sm text-white/70">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{answeredCount} correct</span>
        </div>
        <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-2" />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-black/60 border-white/10 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-black/80 border-b border-white/10">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/30 text-primary border-primary/50">
                  {currentQuestion?.points} {currentQuestion?.points === 1 ? 'point' : 'points'}
                </Badge>
                <span className="text-sm text-white/50">
                  Q{currentIndex + 1}
                </span>
              </div>
              {currentQuestion?.question_text && (
                <CardTitle className="text-lg text-white">{currentQuestion.question_text}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-6 pt-6 bg-black/40">
              {/* Audio player */}
              {currentQuestion?.audio_url && (
                <div className="flex items-center justify-center gap-6 p-8 bg-muted rounded-xl border border-border">
                  <Button
                    size="lg"
                    onClick={toggleAudio}
                    className={cn(
                      "w-20 h-20 rounded-full transition-all shadow-lg",
                      isPlaying 
                        ? "bg-foreground text-background hover:bg-foreground/90" 
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <Volume2 className="w-5 h-5" />
                      <span className="font-medium">
                        {isPlaying ? 'Playing...' : 'Listen'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Click to play audio</span>
                  </div>
                </div>
              )}
              
              {/* Answer options in columns */}
              <div 
                className={cn(
                  "grid gap-3",
                  columns === 1 && "grid-cols-1",
                  columns === 2 && "grid-cols-2",
                  columns === 3 && "grid-cols-3"
                )}
              >
                {currentQuestion?.answers.map((answer, idx) => {
                  const isSelected = currentAnswer?.selectedAnswerId === answer.id;
                  const showCorrect = showFeedback && answer.is_correct && currentAnswer?.correct;
                  const showWrong = showFeedback && isSelected && !answer.is_correct;
                  const disabled = currentAnswer?.correct || showFeedback;
                  
                  return (
                    <motion.button
                      key={answer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleSelectAnswer(answer.id)}
                      disabled={disabled}
                      className={cn(
                        "p-3 text-left rounded-lg border transition-all text-sm",
                        "hover:border-primary hover:bg-primary/20",
                        "disabled:cursor-default",
                        "bg-black/50 text-white",
                        isSelected && !showFeedback && "border-primary bg-primary/30 ring-1 ring-primary/50",
                        showCorrect && "border-green-500 bg-green-500/30 ring-1 ring-green-500/50",
                        showWrong && "border-red-500 bg-red-500/30 ring-1 ring-red-500/50",
                        !isSelected && !showCorrect && !showWrong && "border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{answer.answer_text}</span>
                        {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                        {showWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Feedback message */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "p-4 rounded-lg text-center",
                      currentAnswer?.correct 
                        ? "bg-green-500/20 text-green-300 border border-green-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    )}
                  >
                    {currentAnswer?.correct ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>
                          {currentAnswer.attempts === 1 
                            ? `Correct! +${currentAnswer.pointsEarned} points`
                            : `Correct on second try! +${currentAnswer.pointsEarned} points`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-5 h-5" />
                        <span>
                          {(currentAnswer?.attempts || 0) < 2 && currentQuestion && currentQuestion.answers.length > 2
                            ? 'Try again for half points!'
                            : 'Incorrect. Moving on...'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Navigation - always visible */}
              <div className="flex gap-3 pt-2">
                {!isLastQuestion && (
                  <Button 
                    onClick={handleNext} 
                    variant={canProceed ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      canProceed 
                        ? "bg-primary hover:bg-primary/90" 
                        : "border-white/20 text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    size="lg"
                  >
                    {canProceed ? 'Next Question' : 'Skip'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {isLastQuestion && (
                  <Button 
                    onClick={handleNext} 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    size="lg"
                    disabled={!canProceed}
                  >
                    Complete Test
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
