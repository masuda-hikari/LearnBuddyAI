import { Router, Request, Response } from 'express';
import { PlanService, PlanType, PlanLimits } from '../services/plan';
import { authenticate, requirePremium, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

interface UpgradeRequest {
  plan: PlanType;
}

/**
 * GET /api/plans
 * プラン一覧取得（公開）
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const planService = new PlanService();
    const plans = planService.getAllPlans();

    res.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        features: plan.features,
        limits: plan.limits,
      })),
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'プラン一覧の取得に失敗しました' });
  }
});

/**
 * GET /api/plans/:planId
 * プラン詳細取得（公開）
 */
router.get('/:planId', (req: Request<{ planId: string }>, res: Response) => {
  try {
    const { planId } = req.params;
    const planService = new PlanService();
    const plan = planService.getPlanDetails(planId as PlanType);

    if (!plan) {
      res.status(404).json({ error: '指定されたプランが見つかりません' });
      return;
    }

    res.json({ plan });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'プラン情報の取得に失敗しました' });
  }
});

/**
 * GET /api/plans/subscription/current
 * 現在のサブスクリプション情報取得
 */
router.get(
  '/subscription/current',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const planService = new PlanService();
      const subscription = await planService.getSubscription(req.user.userId);

      if (!subscription) {
        // サブスクリプションがない場合は作成
        const newSub = await planService.createSubscription(req.user.userId, 'free');
        res.json({ subscription: newSub });
        return;
      }

      const planDetails = planService.getPlanDetails(subscription.plan);

      res.json({
        subscription,
        planDetails,
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: 'サブスクリプション情報の取得に失敗しました' });
    }
  }
);

/**
 * GET /api/plans/usage/remaining
 * 残り利用回数取得
 */
router.get('/usage/remaining', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const planService = new PlanService();
    const usage = await planService.getRemainingUsage(req.user.userId);

    res.json({ usage });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: '利用状況の取得に失敗しました' });
  }
});

/**
 * POST /api/plans/upgrade
 * プランアップグレード
 * 収益化観点：有料プランへの誘導ポイント
 */
router.post(
  '/upgrade',
  authenticate,
  async (req: AuthenticatedRequest & { body: UpgradeRequest }, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { plan } = req.body;

      if (!plan || !['premium', 'education'].includes(plan)) {
        res.status(400).json({ error: '有効なプランを指定してください' });
        return;
      }

      // NOTE: 本番環境ではここでStripe等の決済処理を行う
      // 現在はデモ用に即時アップグレード

      const planService = new PlanService();
      const subscription = await planService.upgradePlan(req.user.userId, plan);

      res.json({
        success: true,
        message: `${plan}プランにアップグレードしました`,
        subscription,
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(500).json({ error: 'プランのアップグレードに失敗しました' });
    }
  }
);

/**
 * POST /api/plans/cancel
 * サブスクリプションキャンセル予約
 */
router.post('/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const planService = new PlanService();
    const subscription = await planService.scheduleCancellation(req.user.userId);

    if (!subscription) {
      res.status(404).json({ error: 'サブスクリプションが見つかりません' });
      return;
    }

    res.json({
      success: true,
      message: '期間終了時にキャンセルされます',
      subscription,
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'キャンセルに失敗しました' });
  }
});

/**
 * POST /api/plans/cancel/undo
 * キャンセル予約取り消し
 */
router.post('/cancel/undo', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const planService = new PlanService();
    const subscription = await planService.cancelCancellation(req.user.userId);

    if (!subscription) {
      res.status(404).json({ error: 'サブスクリプションが見つかりません' });
      return;
    }

    res.json({
      success: true,
      message: 'キャンセル予約を取り消しました',
      subscription,
    });
  } catch (error) {
    console.error('Undo cancel error:', error);
    res.status(500).json({ error: 'キャンセル取り消しに失敗しました' });
  }
});

/**
 * GET /api/plans/features/check/:feature
 * 機能アクセス権チェック
 */
router.get(
  '/features/check/:feature',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const { feature } = req.params;
      const planService = new PlanService();
      const result = await planService.canAccessFeature(
        req.user.userId,
        feature as keyof PlanLimits
      );

      res.json(result);
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: '機能チェックに失敗しました' });
    }
  }
);

/**
 * GET /api/plans/premium/analytics
 * Premium専用分析機能（デモ）
 */
router.get(
  '/premium/analytics',
  authenticate,
  requirePremium,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      // Premium専用の詳細分析機能（analyticsサービスを使用）
      const { AnalyticsService } = await import('../services/analytics');
      const analyticsService = new AnalyticsService();

      const [wordPerformance, learningPatterns] = await Promise.all([
        analyticsService.analyzeWordPerformance(req.user.userId),
        analyticsService.analyzeLearningPattern(req.user.userId),
      ]);

      res.json({
        premium: true,
        wordPerformance,
        learningPatterns,
        message: 'Premium専用の詳細分析データです',
      });
    } catch (error) {
      console.error('Premium analytics error:', error);
      res.status(500).json({ error: '分析データの取得に失敗しました' });
    }
  }
);

export { router as planRouter };
