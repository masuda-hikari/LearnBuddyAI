import { Router, Request, Response } from 'express';
import { LessonService } from '../services/lesson';

const router = Router();

/**
 * GET /api/lessons
 * 利用可能なレッスン一覧を取得
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const lessonService = new LessonService();
    const lessons = await lessonService.getAllLessons();
    res.json({ lessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'レッスン一覧の取得に失敗しました' });
  }
});

/**
 * GET /api/lessons/:id
 * 特定のレッスン詳細を取得
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lessonService = new LessonService();
    const lesson = await lessonService.getLessonById(id);

    if (!lesson) {
      res.status(404).json({ error: 'レッスンが見つかりません' });
      return;
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'レッスンの取得に失敗しました' });
  }
});

/**
 * POST /api/lessons/:id/complete
 * レッスン完了を記録
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, score } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'ユーザーIDが必要です' });
      return;
    }

    const lessonService = new LessonService();
    await lessonService.markComplete(userId, id, score);

    res.json({ success: true, message: 'レッスン完了を記録しました' });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ error: 'レッスン完了の記録に失敗しました' });
  }
});

export { router as lessonRouter };
