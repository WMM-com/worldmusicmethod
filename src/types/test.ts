// Types for the test/quiz system

export interface LessonTest {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  randomize_questions: boolean;
  allow_retry: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_text: string | null;
  audio_url: string | null;
  order_index: number;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface TestAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface UserTestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  max_score: number;
  percentage: number;
  question_results: QuestionResult[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface QuestionResult {
  question_id: string;
  correct: boolean;
  attempts: number;
  points_earned: number;
}

// Extended types with relations
export interface TestQuestionWithAnswers extends TestQuestion {
  answers: TestAnswer[];
}

export interface LessonTestWithQuestions extends LessonTest {
  questions: TestQuestionWithAnswers[];
}

// For the test-taking UI
export interface TestState {
  currentQuestionIndex: number;
  questionOrder: string[]; // Shuffled question IDs
  answers: Record<string, { selectedAnswerId: string | null; attempts: number; correct: boolean }>;
  completed: boolean;
  score: number;
  maxScore: number;
}
