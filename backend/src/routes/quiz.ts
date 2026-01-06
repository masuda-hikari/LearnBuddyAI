import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai';

const router = Router();

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizSubmission {
  quizId: string;
  answers: number[];
  userId?: string;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  details: {
    questionIndex: number;
    correct: boolean;
    userAnswer: number;
    correctAnswer: number;
    explanation: string;
  }[];
}

// メモリ内クイズ保存（後でDB移行）
const quizCache: Map<string, QuizQuestion[]> = new Map();

/**
 * GET /api/quiz/:topic
 * 指定トピックのクイズを取得
 */
router.get('/:topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.params;
    const difficulty = (req.query.difficulty as string) || 'medium';

    // キャッシュ確認
    const cacheKey = `${topic}-${difficulty}`;
    if (quizCache.has(cacheKey)) {
      const questions = quizCache.get(cacheKey)!;
      res.json({
        quizId: cacheKey,
        topic,
        difficulty,
        questions: questions.map((q) => ({
          question: q.question,
          options: q.options,
        })),
      });
      return;
    }

    // AI生成
    const aiService = new AIService();
    const questions = await aiService.generateQuiz(topic, difficulty);

    // キャッシュ保存
    quizCache.set(cacheKey, questions);

    res.json({
      quizId: cacheKey,
      topic,
      difficulty,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
      })),
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'クイズの生成に失敗しました' });
  }
});

/**
 * POST /api/quiz/submit
 * クイズ回答を提出して採点
 */
router.post('/submit', async (req: Request<object, QuizResult, QuizSubmission>, res: Response) => {
  try {
    const { quizId, answers } = req.body;
    // userId は将来の進捗記録用（現在未使用）

    if (!quizId || !answers || !Array.isArray(answers)) {
      res.status(400).json({ error: 'quizIdと回答配列が必要です' });
      return;
    }

    const questions = quizCache.get(quizId);
    if (!questions) {
      res.status(404).json({ error: 'クイズが見つかりません' });
      return;
    }

    // 採点
    const details = questions.map((q, index) => ({
      questionIndex: index,
      correct: answers[index] === q.correctIndex,
      userAnswer: answers[index],
      correctAnswer: q.correctIndex,
      explanation: q.explanation,
    }));

    const correctCount = details.filter((d) => d.correct).length;

    const result: QuizResult = {
      score: correctCount,
      total: questions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      details,
    };

    // TODO: ユーザー進捗に記録

    res.json(result);
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ error: '採点に失敗しました' });
  }
});

export { router as quizRouter };
