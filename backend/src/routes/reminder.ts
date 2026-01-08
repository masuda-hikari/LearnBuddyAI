import { Router, Request, Response } from 'express';
import { ReminderService } from '../services/reminder';

const router = Router();

/**
 * GET /api/reminders/settings
 * リマインダー設定を取得
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const reminderService = new ReminderService();
    let settings = await reminderService.getSettings(userId);

    // 設定が存在しない場合はデフォルトを作成
    if (!settings) {
      settings = await reminderService.updateSettings(userId, {});
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get reminder settings error:', error);
    res.status(500).json({ error: 'リマインダー設定の取得に失敗しました' });
  }
});

/**
 * PUT /api/reminders/settings
 * リマインダー設定を更新
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { enabled, preferredTime, timezone, frequency } = req.body;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    // バリデーション
    if (preferredTime && !/^\d{2}:\d{2}$/.test(preferredTime)) {
      res.status(400).json({ error: '時刻形式が不正です（HH:MM形式）' });
      return;
    }

    if (frequency && !['daily', 'weekdays', 'weekends', 'custom'].includes(frequency)) {
      res.status(400).json({ error: '頻度の値が不正です' });
      return;
    }

    const reminderService = new ReminderService();
    const settings = await reminderService.updateSettings(userId, {
      enabled,
      preferredTime,
      timezone,
      frequency,
    });

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Update reminder settings error:', error);
    res.status(500).json({ error: 'リマインダー設定の更新に失敗しました' });
  }
});

/**
 * GET /api/reminders/status
 * 学習状況サマリーを取得（リマインダーコンテンツ用）
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const reminderService = new ReminderService();
    const status = await reminderService.getLearningStatus(userId);

    res.json({ status });
  } catch (error) {
    console.error('Get learning status error:', error);
    res.status(500).json({ error: '学習状況の取得に失敗しました' });
  }
});

/**
 * POST /api/reminders/sessions/start
 * 学習セッションを開始
 */
router.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { fromReminder } = req.body;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const reminderService = new ReminderService();
    const session = await reminderService.startSession(userId, fromReminder || false);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'セッション開始に失敗しました' });
  }
});

/**
 * PUT /api/reminders/sessions/:sessionId
 * 学習セッションを更新
 */
router.put('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const sessionId = parseInt(req.params.sessionId);
    const { wordsReviewed, quizCompleted } = req.body;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'セッションIDが不正です' });
      return;
    }

    const reminderService = new ReminderService();
    await reminderService.updateSession(sessionId, { wordsReviewed, quizCompleted });

    res.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'セッション更新に失敗しました' });
  }
});

/**
 * POST /api/reminders/sessions/:sessionId/end
 * 学習セッションを終了
 */
router.post('/sessions/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const sessionId = parseInt(req.params.sessionId);

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'セッションIDが不正です' });
      return;
    }

    const reminderService = new ReminderService();
    await reminderService.endSession(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'セッション終了に失敗しました' });
  }
});

/**
 * GET /api/reminders/sessions
 * 最近の学習セッションを取得
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const reminderService = new ReminderService();
    const sessions = await reminderService.getRecentSessions(userId, limit);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'セッション履歴の取得に失敗しました' });
  }
});

export { router as reminderRouter };
