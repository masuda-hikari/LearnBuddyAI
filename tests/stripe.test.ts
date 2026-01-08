import { StripeService, STRIPE_PRICE_IDS } from '../backend/src/services/stripe';
import { PlanService, PlanType, PLANS } from '../backend/src/services/plan';
import { DatabaseService } from '../backend/src/services/database';

/**
 * Stripeサービステスト
 *
 * 注意: 実際のStripe APIはモックなしでは使用不可
 * 環境変数STRIPE_SECRET_KEYが設定されていない場合、
 * Stripeは無効状態としてテストされる
 */
describe('StripeService', () => {
  let stripeService: StripeService;
  let planService: PlanService;

  beforeAll(() => {
    // テスト用データベース初期化
    DatabaseService.getInstance();
    // PlanServiceを先に初期化してsubscriptionsテーブルを作成
    new PlanService();
  });

  beforeEach(() => {
    // PlanServiceが先に初期化されているのでStripeServiceも問題なく動作
    planService = new PlanService();
    stripeService = new StripeService();
  });

  describe('isEnabled', () => {
    it('STRIPE_SECRET_KEYがない場合はfalseを返す', () => {
      // 環境変数が設定されていない場合のテスト
      // テスト環境ではSTRIPE_SECRET_KEYは設定されていないはず
      const isEnabled = stripeService.isEnabled();

      // 環境変数の有無に応じた期待値
      if (process.env.STRIPE_SECRET_KEY) {
        expect(isEnabled).toBe(true);
      } else {
        expect(isEnabled).toBe(false);
      }
    });
  });

  describe('getPriceIds', () => {
    it('全プランのPrice IDを返す', () => {
      const priceIds = stripeService.getPriceIds();

      expect(priceIds).toHaveProperty('free');
      expect(priceIds).toHaveProperty('premium');
      expect(priceIds).toHaveProperty('education');

      expect(priceIds.premium.monthly).toBeDefined();
      expect(priceIds.premium.yearly).toBeDefined();
      expect(priceIds.education.monthly).toBeDefined();
      expect(priceIds.education.yearly).toBeDefined();
    });

    it('FreeプランのPrice IDは空', () => {
      const priceIds = stripeService.getPriceIds();

      expect(priceIds.free.monthly).toBe('');
      expect(priceIds.free.yearly).toBe('');
    });
  });

  describe('STRIPE_PRICE_IDS定数', () => {
    it('正しい構造を持つ', () => {
      expect(STRIPE_PRICE_IDS).toHaveProperty('free');
      expect(STRIPE_PRICE_IDS).toHaveProperty('premium');
      expect(STRIPE_PRICE_IDS).toHaveProperty('education');

      // 各プランにmonthly/yearlyがある
      const plans: PlanType[] = ['free', 'premium', 'education'];
      plans.forEach((plan) => {
        expect(STRIPE_PRICE_IDS[plan]).toHaveProperty('monthly');
        expect(STRIPE_PRICE_IDS[plan]).toHaveProperty('yearly');
      });
    });
  });

  describe('Stripeが無効な場合のエラーハンドリング', () => {
    // Stripe APIキーが設定されていない環境でのテスト
    it('createCheckoutSessionがエラーを投げる（Stripe無効時）', async () => {
      if (stripeService.isEnabled()) {
        // Stripeが有効な場合はスキップ
        expect(true).toBe(true);
        return;
      }

      await expect(
        stripeService.createCheckoutSession({
          userId: 'test-user',
          email: 'test@example.com',
          plan: 'premium',
          billingCycle: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Stripe is not configured');
    });

    it('createBillingPortalSessionがエラーを投げる（Stripe無効時）', async () => {
      if (stripeService.isEnabled()) {
        expect(true).toBe(true);
        return;
      }

      await expect(stripeService.createBillingPortalSession('test-user', 'https://example.com/return')).rejects.toThrow(
        'Stripe is not configured'
      );
    });

    it('cancelSubscriptionがエラーを投げる（Stripe無効時）', async () => {
      if (stripeService.isEnabled()) {
        expect(true).toBe(true);
        return;
      }

      await expect(stripeService.cancelSubscription('test-user')).rejects.toThrow('Stripe is not configured');
    });

    it('reactivateSubscriptionがエラーを投げる（Stripe無効時）', async () => {
      if (stripeService.isEnabled()) {
        expect(true).toBe(true);
        return;
      }

      await expect(stripeService.reactivateSubscription('test-user')).rejects.toThrow('Stripe is not configured');
    });
  });
});

describe('PlanService with Stripe', () => {
  let planService: PlanService;

  beforeAll(() => {
    // テスト用データベース初期化
    DatabaseService.getInstance();
  });

  beforeEach(() => {
    planService = new PlanService();
  });

  afterEach(() => {
    // テストデータクリーンアップ
    const db = DatabaseService.getInstance().getDb();
    db.exec("DELETE FROM subscriptions WHERE user_id LIKE 'stripe-test-%'");
    db.exec("DELETE FROM users WHERE email LIKE '%@stripe-test.com'");
  });

  describe('isStripeEnabled', () => {
    it('Stripe有効状態を確認できる', () => {
      const isEnabled = planService.isStripeEnabled();

      // 環境変数の有無に応じた期待値
      if (process.env.STRIPE_SECRET_KEY) {
        expect(isEnabled).toBe(true);
      } else {
        expect(isEnabled).toBe(false);
      }
    });
  });

  describe('Stripe連携メソッド（Stripe無効時）', () => {
    it('createCheckoutSessionがエラーを投げる', async () => {
      if (planService.isStripeEnabled()) {
        expect(true).toBe(true);
        return;
      }

      await expect(
        planService.createCheckoutSession(
          'test-user',
          'test@example.com',
          'premium',
          'monthly',
          'https://example.com/success',
          'https://example.com/cancel'
        )
      ).rejects.toThrow('Stripe is not configured');
    });

    it('createBillingPortalSessionがエラーを投げる', async () => {
      if (planService.isStripeEnabled()) {
        expect(true).toBe(true);
        return;
      }

      await expect(planService.createBillingPortalSession('test-user', 'https://example.com/return')).rejects.toThrow(
        'Stripe is not configured'
      );
    });

    it('cancelSubscriptionViaStripeがローカル処理にフォールバック', async () => {
      if (planService.isStripeEnabled()) {
        expect(true).toBe(true);
        return;
      }

      // テストユーザーとサブスクリプション作成
      const db = DatabaseService.getInstance().getDb();
      const userId = 'stripe-test-cancel';

      // ユーザー作成
      db.prepare(
        `
        INSERT INTO users (id, username, email, password_hash, plan, created_at)
        VALUES (?, ?, ?, ?, 'premium', ?)
      `
      ).run(userId, 'canceltest', 'cancel@stripe-test.com', 'hash', new Date().toISOString());

      // サブスクリプション作成
      await planService.createSubscription(userId, 'premium');

      // キャンセル実行（Stripeなしでローカル処理）
      await planService.cancelSubscriptionViaStripe(userId);

      // キャンセル予約されていることを確認
      const subscription = await planService.getSubscription(userId);
      expect(subscription).not.toBeNull();
      expect(subscription?.cancelAtPeriodEnd).toBe(true);
    });

    it('reactivateSubscriptionViaStripeがローカル処理にフォールバック', async () => {
      if (planService.isStripeEnabled()) {
        expect(true).toBe(true);
        return;
      }

      // テストユーザーとサブスクリプション作成
      const db = DatabaseService.getInstance().getDb();
      const userId = 'stripe-test-reactivate';

      // ユーザー作成
      db.prepare(
        `
        INSERT INTO users (id, username, email, password_hash, plan, created_at)
        VALUES (?, ?, ?, ?, 'premium', ?)
      `
      ).run(userId, 'reactivatetest', 'reactivate@stripe-test.com', 'hash', new Date().toISOString());

      // サブスクリプション作成（キャンセル予約済み）
      await planService.createSubscription(userId, 'premium');
      await planService.scheduleCancellation(userId);

      // 再有効化実行
      await planService.reactivateSubscriptionViaStripe(userId);

      // 再有効化されていることを確認
      const subscription = await planService.getSubscription(userId);
      expect(subscription).not.toBeNull();
      expect(subscription?.cancelAtPeriodEnd).toBe(false);
    });
  });
});

describe('PLANS定数', () => {
  it('Freeプランの価格は0', () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.yearlyPrice).toBe(0);
  });

  it('Premiumプランの価格は980円/月', () => {
    expect(PLANS.premium.price).toBe(980);
    expect(PLANS.premium.yearlyPrice).toBe(9800);
  });

  it('Educationプランの価格は要問合せ（0）', () => {
    expect(PLANS.education.price).toBe(0);
    expect(PLANS.education.yearlyPrice).toBe(0);
  });

  it('各プランにfeatures配列がある', () => {
    const plans: PlanType[] = ['free', 'premium', 'education'];
    plans.forEach((plan) => {
      expect(Array.isArray(PLANS[plan].features)).toBe(true);
      expect(PLANS[plan].features.length).toBeGreaterThan(0);
    });
  });

  it('各プランにlimitsオブジェクトがある', () => {
    const plans: PlanType[] = ['free', 'premium', 'education'];
    plans.forEach((plan) => {
      expect(PLANS[plan].limits).toBeDefined();
      expect(PLANS[plan].limits.dailyQuestions).toBeDefined();
      expect(PLANS[plan].limits.lessonsPerMonth).toBeDefined();
      expect(typeof PLANS[plan].limits.analyticsAccess).toBe('boolean');
      expect(typeof PLANS[plan].limits.curriculumAccess).toBe('boolean');
    });
  });
});
