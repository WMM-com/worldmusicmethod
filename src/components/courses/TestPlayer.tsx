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
        audio.src = currentQuestion.audio_url;
        audio.play().then(() => {
          setIsPlaying(true);
          setHasAutoPlayed(true);
        }).catch(() => {
          // Autoplay blocked, user will need to click
        });
      }
    }
  }, [currentIndex, started, currentQuestion, hasAutoPlayed]);
  
  // Handle audio play/pause
  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
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
    
    // If wrong and can retry, allow selection again after brief feedback
    if (!isCorrect && canRetry) {
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
      <Card className="max-w-2xl mx-auto bg-card border-border">
        <CardHeader className="text-center bg-muted/50 rounded-t-lg">
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          {test.description && (
            <p className="text-muted-foreground mt-2">{test.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg border border-border">
              <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border">
              <div className="text-2xl font-bold text-primary">{test.passing_score}%</div>
              <div className="text-sm text-muted-foreground">To Pass</div>
            </div>
          </div>
          
          {previousAttempt && (
            <div className="p-4 bg-primary/20 rounded-lg text-center border border-primary/30">
              <p className="text-sm text-muted-foreground">Your best score</p>
              <p className="text-xl font-bold text-primary">
                {Math.round(previousAttempt.percentage)}%
              </p>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 p-4 rounded-lg">
            <p>• Listen to each audio clip and select the correct answer</p>
            <p>• You can replay the audio as many times as you like</p>
            <p>• If you select a wrong answer, you get one more try for half points</p>
            <p>• Questions are presented in random order</p>
          </div>
          
          <Button onClick={handleStart} className="w-full" size="lg">
            Start Test
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Completed screen
  if (completed) {
    return (
      <Card className="max-w-2xl mx-auto bg-card border-border">
        <CardHeader className="text-center bg-muted/50 rounded-t-lg">
          <div className={cn(
            "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
            passed ? "bg-green-500/20 border border-green-500/30" : "bg-amber-500/20 border border-amber-500/30"
          )}>
            <Trophy className={cn(
              "w-10 h-10",
              passed ? "text-green-500" : "text-amber-500"
            )} />
          </div>
          <CardTitle className="text-2xl">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            {passed 
              ? 'You passed the test!'
              : `You need ${test.passing_score}% to pass. Keep trying!`}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <div className={cn(
              "text-5xl font-bold mb-2",
              passed ? "text-green-500" : "text-amber-500"
            )}>
              {percentage}%
            </div>
            <p className="text-muted-foreground">
              {score} / {maxScore} points
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="font-bold text-green-500">
                {Object.values(answers).filter(a => a.correct && a.attempts === 1).length}
              </div>
              <div className="text-muted-foreground">Correct (1st try)</div>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
              <div className="font-bold text-amber-500">
                {Object.values(answers).filter(a => a.correct && a.attempts > 1).length}
              </div>
              <div className="text-muted-foreground">Correct (2nd try)</div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handleRestart} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onComplete} className="flex-1">
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
        crossOrigin="anonymous"
      />
      
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={((currentIndex + 1) / totalQuestions) * 100} />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="bg-muted/50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {currentQuestion?.points} {currentQuestion?.points === 1 ? 'point' : 'points'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Question {currentIndex + 1}
                </span>
              </div>
              {currentQuestion?.question_text && (
                <CardTitle className="text-lg">{currentQuestion.question_text}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Audio player */}
              {currentQuestion?.audio_url && (
                <div className="flex items-center justify-center gap-4 p-6 bg-muted rounded-lg border border-border">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={toggleAudio}
                    className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Volume2 className="w-5 h-5" />
                    <span className="text-sm">
                      {isPlaying ? 'Playing...' : 'Click to play'}
                    </span>
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
                        "p-3 text-left rounded-lg border-2 transition-all text-sm",
                        "hover:border-primary hover:bg-primary/10",
                        "disabled:cursor-default bg-muted/50",
                        isSelected && !showFeedback && "border-primary bg-primary/20",
                        showCorrect && "border-green-500 bg-green-500/20",
                        showWrong && "border-red-500 bg-red-500/20",
                        !isSelected && !showCorrect && !showWrong && "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{answer.answer_text}</span>
                        {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                        {showWrong && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
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
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
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
              
              {/* Next Question button - prominent and clear */}
              {canProceed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Button 
                    onClick={handleNext} 
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {isLastQuestion ? 'Complete Test' : 'Next Question'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      
      {/* Note about lesson navigation */}
      <p className="text-xs text-muted-foreground text-center">
        Use the button above to navigate between questions. The lesson arrows navigate between lessons.
      </p>
    </div>
  );
}
