import { v4 as uuidv4 } from 'uuid';
import { DatabaseService, DbUser } from './database';
import { StripeService } from './stripe';

/**
 * プラン種別
 */
export type PlanType = 'free' | 'premium' | 'education';

/**
 * プラン詳細
 */
export interface PlanDetails {
  id: PlanType;
  name: string;
  price: number; // 月額（円）
  yearlyPrice: number; // 年額（円）
  features: string[];
  limits: PlanLimits;
}

/**
 * プラン制限
 */
export interface PlanLimits {
  dailyQuestions: number; // 日次質問数（-1は無制限）
  lessonsPerMonth: number; // 月次レッスン数（-1は無制限）
  analyticsAccess: boolean; // 詳細分析へのアクセス
  curriculumAccess: boolean; // 適応型カリキュラムへのアクセス
  reminderFeatures: boolean; // リマインダー機能
  exportData: boolean; // データエクスポート
  prioritySupport: boolean; // 優先サポート
}

/**
 * サブスクリプション情報
 */
export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DBサブスクリプション型
 */
interface DbSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
}

/**
 * プラン定義
 */
export const PLANS: Record<PlanType, PlanDetails> = {
  free: {
    id: 'free',
    name: 'フリープラン',
    price: 0,
    yearlyPrice: 0,
    features: ['1日5回までの質問', '基本レッスン', 'クイズ機能', '広告表示あり'],
    limits: {
      dailyQuestions: 5,
      lessonsPerMonth: 10,
      analyticsAccess: false,
      curriculumAccess: false,
      reminderFeatures: false,
      exportData: false,
      prioritySupport: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'プレミアムプラン',
    price: 980,
    yearlyPrice: 9800, // 2ヶ月分お得
    features: [
      '無制限の質問',
      '全レッスンアクセス',
      '詳細学習分析',
      '適応型カリキュラム',
      '学習リマインダー',
      'データエクスポート',
      '広告なし',
    ],
    limits: {
      dailyQuestions: -1,
      lessonsPerMonth: -1,
      analyticsAccess: true,
      curriculumAccess: true,
      reminderFeatures: true,
      exportData: true,
      prioritySupport: false,
    },
  },
  education: {
    id: 'education',
    name: '教育機関プラン',
    price: 0, // 要問合せ
    yearlyPrice: 0,
    features: [
      'プレミアム全機能',
      '管理者ダッシュボード',
      '複数ユーザー管理',
      '一括購入割引',
      '優先サポート',
      'カスタムコンテンツ',
    ],
    limits: {
      dailyQuestions: -1,
      lessonsPerMonth: -1,
      analyticsAccess: true,
      curriculumAccess: true,
      reminderFeatures: true,
      exportData: true,
      prioritySupport: true,
    },
  },
};

/**
 * プランサービス - 料金プラン管理
 * 収益化観点：サブスクリプション課金の中核機能
 */
export class PlanService {
  private db = DatabaseService.getInstance().getDb();
  private stripeService: StripeService | null = null;

  constructor() {
    this.initializeSubscriptionTable();
    // Stripeサービスは遅延初期化（循環参照回避）
  }

  /**
   * Stripeサービス取得（遅延初期化）
   */
  private getStripeService(): StripeService {
    if (!this.stripeService) {
      this.stripeService = new StripeService();
    }
    return this.stripeService;
  }

  /**
   * サブスクリプションテーブル初期化
   */
  private initializeSubscriptionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start TEXT NOT NULL,
        current_period_end TEXT NOT NULL,
        cancel_at_period_end INTEGER DEFAULT 0,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // インデックス作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    `);
  }

  /**
   * プラン一覧取得
   */
  getAllPlans(): PlanDetails[] {
    return Object.values(PLANS);
  }

  /**
   * プラン詳細取得
   */
  getPlanDetails(planId: PlanType): PlanDetails | null {
    return PLANS[planId] || null;
  }

  /**
   * プラン制限取得
   */
  getPlanLimits(planId: PlanType): PlanLimits | null {
    const plan = PLANS[planId];
    return plan ? plan.limits : null;
  }

  /**
   * DBレコードをSubscriptionに変換
   */
  private dbToSubscription(dbSub: DbSubscription): Subscription {
    return {
      id: dbSub.id,
      userId: dbSub.user_id,
      plan: dbSub.plan as PlanType,
      status: dbSub.status as Subscription['status'],
      currentPeriodStart: dbSub.current_period_start,
      currentPeriodEnd: dbSub.current_period_end,
      cancelAtPeriodEnd: dbSub.cancel_at_period_end === 1,
      createdAt: dbSub.created_at,
      updatedAt: dbSub.updated_at,
    };
  }

  /**
   * ユーザーのサブスクリプション取得
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    const dbSub = this.db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as
      | DbSubscription
      | undefined;

    return dbSub ? this.dbToSubscription(dbSub) : null;
  }

  /**
   * サブスクリプション作成（新規ユーザー用）
   */
  async createSubscription(userId: string, plan: PlanType = 'free'): Promise<Subscription> {
    const id = uuidv4();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    this.db
      .prepare(
        `
      INSERT INTO subscriptions (id, user_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
    `
      )
      .run(
        id,
        userId,
        plan,
        now.toISOString(),
        periodEnd.toISOString(),
        now.toISOString(),
        now.toISOString()
      );

    return {
      id,
      userId,
      plan,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  /**
   * プランアップグレード
   */
  async upgradePlan(userId: string, newPlan: PlanType): Promise<Subscription | null> {
    const existing = await this.getSubscription(userId);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (!existing) {
      // サブスクリプションがない場合は作成
      return this.createSubscription(userId, newPlan);
    }

    // サブスクリプション更新
    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET plan = ?, status = 'active', current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, updated_at = ?
      WHERE user_id = ?
    `
      )
      .run(newPlan, now.toISOString(), periodEnd.toISOString(), now.toISOString(), userId);

    // ユーザーテーブルも更新
    this.db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(newPlan, userId);

    return this.getSubscription(userId);
  }

  /**
   * プランダウングレード（期間終了時に反映）
   */
  async scheduleCancellation(userId: string): Promise<Subscription | null> {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET cancel_at_period_end = 1, updated_at = ?
      WHERE user_id = ?
    `
      )
      .run(now, userId);

    return this.getSubscription(userId);
  }

  /**
   * キャンセル予約を取り消し
   */
  async cancelCancellation(userId: string): Promise<Subscription | null> {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET cancel_at_period_end = 0, updated_at = ?
      WHERE user_id = ?
    `
      )
      .run(now, userId);

    return this.getSubscription(userId);
  }

  /**
   * 即時キャンセル（返金処理等は別途）
   */
  async cancelImmediately(userId: string): Promise<Subscription | null> {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET plan = 'free', status = 'cancelled', cancel_at_period_end = 0, updated_at = ?
      WHERE user_id = ?
    `
      )
      .run(now, userId);

    // ユーザーテーブルも更新
    this.db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(userId);

    return this.getSubscription(userId);
  }

  /**
   * サブスクリプション更新処理（定期実行用）
   * 期間終了時にcancelAtPeriodEndならfreeにダウングレード
   */
  async processExpiredSubscriptions(): Promise<number> {
    const now = new Date().toISOString();

    // キャンセル予約済みで期間終了したサブスクリプションを更新
    const result = this.db
      .prepare(
        `
      UPDATE subscriptions
      SET plan = 'free', status = 'expired', updated_at = ?
      WHERE cancel_at_period_end = 1 AND current_period_end < ? AND status = 'active'
    `
      )
      .run(now, now);

    // 対象ユーザーのプランも更新
    this.db
      .prepare(
        `
      UPDATE users
      SET plan = 'free'
      WHERE id IN (
        SELECT user_id FROM subscriptions WHERE status = 'expired'
      )
    `
      )
      .run();

    return result.changes;
  }

  /**
   * 機能アクセス権チェック
   */
  async canAccessFeature(
    userId: string,
    feature: keyof PlanLimits
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = this.db.prepare('SELECT plan FROM users WHERE id = ?').get(userId) as
      | { plan: string }
      | undefined;

    if (!user) {
      return { allowed: false, reason: 'ユーザーが見つかりません' };
    }

    const planLimits = this.getPlanLimits(user.plan as PlanType);
    if (!planLimits) {
      return { allowed: false, reason: 'プラン情報が見つかりません' };
    }

    const value = planLimits[feature];
    if (typeof value === 'boolean') {
      if (!value) {
        return {
          allowed: false,
          reason: 'この機能はPremiumプランで利用可能です',
        };
      }
    } else if (typeof value === 'number' && value === 0) {
      return {
        allowed: false,
        reason: 'この機能はPremiumプランで利用可能です',
      };
    }

    return { allowed: true };
  }

  /**
   * 残り利用回数取得
   */
  async getRemainingUsage(userId: string): Promise<{
    dailyQuestions: { used: number; limit: number; remaining: number };
  }> {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
      | DbUser
      | undefined;

    if (!user) {
      return {
        dailyQuestions: { used: 0, limit: 0, remaining: 0 },
      };
    }

    const planLimits = this.getPlanLimits(user.plan as PlanType);
    const limit = planLimits?.dailyQuestions ?? 5;

    const today = new Date().toISOString().split('T')[0];
    const used = user.last_question_date === today ? user.daily_questions_used : 0;

    return {
      dailyQuestions: {
        used,
        limit: limit === -1 ? Infinity : limit,
        remaining: limit === -1 ? Infinity : Math.max(0, limit - used),
      },
    };
  }

  /**
   * Stripe決済連携：Checkout Session作成
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    plan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const stripe = this.getStripeService();
    if (!stripe.isEnabled()) {
      throw new Error('Stripe is not configured');
    }

    return stripe.createCheckoutSession({
      userId,
      email,
      plan,
      billingCycle,
      successUrl,
      cancelUrl,
    });
  }

  /**
   * Stripe決済連携：Billing Portal Session作成
   */
  async createBillingPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = this.getStripeService();
    if (!stripe.isEnabled()) {
      throw new Error('Stripe is not configured');
    }

    return stripe.createBillingPortalSession(userId, returnUrl);
  }

  /**
   * Stripe連携：サブスクリプションキャンセル（Stripe経由）
   */
  async cancelSubscriptionViaStripe(userId: string): Promise<void> {
    const stripe = this.getStripeService();
    if (!stripe.isEnabled()) {
      // Stripeなしの場合はローカルキャンセルのみ
      await this.scheduleCancellation(userId);
      return;
    }

    await stripe.cancelSubscription(userId);
  }

  /**
   * Stripe連携：キャンセル予約取り消し
   */
  async reactivateSubscriptionViaStripe(userId: string): Promise<void> {
    const stripe = this.getStripeService();
    if (!stripe.isEnabled()) {
      // Stripeなしの場合はローカル処理のみ
      await this.cancelCancellation(userId);
      return;
    }

    await stripe.reactivateSubscription(userId);
  }

  /**
   * Stripe利用可否チェック
   */
  isStripeEnabled(): boolean {
    return this.getStripeService().isEnabled();
  }
}
