import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai';

const router = Router();

interface AskRequest {
  question: string;
  context?: string;
}

interface AskResponse {
  answer: string;
  sources?: string[];
}

/**
 * POST /api/ask
 * ユーザーの質問にAIが回答
 */
router.post('/', async (req: Request<{}, AskResponse, AskRequest>, res: Response) => {
  try {
    const { question, context } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: '質問を入力してください' });
      return;
    }

    const aiService = new AIService();
    const answer = await aiService.answerQuestion(question, context);

    res.json({
      answer,
      sources: [],
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: '回答の生成に失敗しました' });
  }
});

export { router as askRouter };
