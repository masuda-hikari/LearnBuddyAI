import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics';

const router = Router();

/**
 * GET /api/analytics
 * 総合学習分析を取得
 *
 * 収益化観点：Premiumユーザー向けの詳細分析機能
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const analysis = await analyticsService.getComprehensiveAnalysis(userId);

    res.json({ analysis });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: '分析データの取得に失敗しました' });
  }
});

/**
 * GET /api/analytics/words
 * 単語パフォーマンス分析を取得
 */
router.get('/words', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const wordAnalysis = await analyticsService.analyzeWordPerformance(userId);

    res.json({ wordAnalysis });
  } catch (error) {
    console.error('Get word analytics error:', error);
    res.status(500).json({ error: '単語分析データの取得に失敗しました' });
  }
});

/**
 * GET /api/analytics/lessons
 * レッスン進捗分析を取得
 */
router.get('/lessons', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const lessonAnalysis = await analyticsService.analyzeLessonProgress(userId);

    res.json({ lessonAnalysis });
  } catch (error) {
    console.error('Get lesson analytics error:', error);
    res.status(500).json({ error: 'レッスン分析データの取得に失敗しました' });
  }
});

/**
 * GET /api/analytics/pattern
 * 学習パターン分析を取得
 */
router.get('/pattern', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const patternAnalysis = await analyticsService.analyzeLearningPattern(userId);

    res.json({ patternAnalysis });
  } catch (error) {
    console.error('Get pattern analytics error:', error);
    res.status(500).json({ error: '学習パターン分析の取得に失敗しました' });
  }
});

/**
 * GET /api/analytics/weaknesses
 * 弱点レポートを取得
 */
router.get('/weaknesses', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const weaknesses = await analyticsService.detectWeaknesses(userId);

    res.json({ weaknesses });
  } catch (error) {
    console.error('Get weaknesses error:', error);
    res.status(500).json({ error: '弱点分析の取得に失敗しました' });
  }
});

/**
 * GET /api/analytics/curriculum
 * 適応型カリキュラムを取得
 *
 * 収益化観点：パーソナライズされたカリキュラムはPremium機能の核心
 */
router.get('/curriculum', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const analyticsService = new AnalyticsService();
    const curriculum = await analyticsService.generateAdaptiveCurriculum(userId);

    res.json({ curriculum });
  } catch (error) {
    console.error('Get curriculum error:', error);
    res.status(500).json({ error: 'カリキュラムの生成に失敗しました' });
  }
});

export { router as analyticsRouter };
