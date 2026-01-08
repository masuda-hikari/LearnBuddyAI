import { Router, Request, Response } from 'express';
import { SpacedRepetitionService } from '../services/spaced-repetition';
import { LessonService } from '../services/lesson';

const router = Router();

/**
 * GET /api/review
 * 今日復習すべき単語を取得
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const srService = new SpacedRepetitionService();
    const lessonService = new LessonService();

    const wordsToReview = await srService.getWordsToReview(userId, limit);

    // 単語の詳細情報を取得
    const allVocab = await lessonService.getVocabularyWords('vocab-basic-english');
    const vocabMap = new Map(allVocab.map((w) => [w.word, w]));

    const enrichedWords = wordsToReview.map((w) => {
      const vocab = vocabMap.get(w.word);
      return {
        ...w,
        definition: vocab?.definition || '',
        definitionJa: vocab?.definitionJa || '',
        example: vocab?.example || '',
        exampleJa: vocab?.exampleJa || '',
        pronunciation: vocab?.pronunciation || '',
      };
    });

    res.json({
      wordsToReview: enrichedWords,
      count: enrichedWords.length,
    });
  } catch (error) {
    console.error('Get review words error:', error);
    res.status(500).json({ error: '復習単語の取得に失敗しました' });
  }
});

/**
 * POST /api/review
 * 単語の復習結果を記録
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { word, quality } = req.body;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    if (!word || quality === undefined) {
      res.status(400).json({ error: '単語と回答品質が必要です' });
      return;
    }

    const srService = new SpacedRepetitionService();
    const result = await srService.recordReview(userId, word, quality);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Record review error:', error);
    res.status(500).json({ error: '復習結果の記録に失敗しました' });
  }
});

/**
 * GET /api/review/stats
 * 学習統計を取得
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const srService = new SpacedRepetitionService();
    const stats = await srService.getStats(userId);

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

/**
 * POST /api/review/start
 * 新しい単語の学習を開始
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { word } = req.body;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    if (!word) {
      res.status(400).json({ error: '単語が必要です' });
      return;
    }

    const srService = new SpacedRepetitionService();
    const lessonService = new LessonService();

    // 既に学習済みか確認
    const existing = await srService.getWordHistory(userId, word);
    if (existing) {
      res.json({
        success: true,
        message: 'この単語は既に学習中です',
        wordHistory: existing,
      });
      return;
    }

    // 単語情報を取得
    const allVocab = await lessonService.getVocabularyWords('vocab-basic-english');
    const vocab = allVocab.find((v) => v.word === word);

    if (!vocab) {
      res.status(404).json({ error: '単語が見つかりません' });
      return;
    }

    // 初回学習として記録（quality=4: 初見だが理解した）
    const result = await srService.recordReview(userId, word, 4);

    res.json({
      success: true,
      message: '単語の学習を開始しました',
      result,
      vocab,
    });
  } catch (error) {
    console.error('Start learning error:', error);
    res.status(500).json({ error: '学習の開始に失敗しました' });
  }
});

export { router as reviewRouter };
