import Stripe from 'stripe';
import { DatabaseService } from './database';
import { PlanType, PLANS } from './plan';

/**
 * Stripe Price ID定義（Stripeダッシュボードで作成した価格ID）
 * 本番環境では環境変数から取得
 */
export const STRIPE_PRICE_IDS: Record<PlanType, { monthly: string; yearly: string }> = {
  free: {
    monthly: '',
    yearly: '',
  },
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
  },
  education: {
    monthly: process.env.STRIPE_EDUCATION_MONTHLY_PRICE_ID || 'price_education_monthly',
    yearly: process.env.STRIPE_EDUCATION_YEARLY_PRICE_ID || 'price_education_yearly',
  },
};

/**
 * Checkout Session作成リクエスト
 */
export interface CreateCheckoutSessionRequest {
  userId: string;
  email: string;
  plan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe Customerメタデータ（型安全のためstring indexを許可）
 */
type CustomerMetadata = {
  userId: string;
  [key: string]: string;
};

/**
 * DB Stripe情報型
 */
interface DbStripeInfo {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

/**
 * Stripeサービス - 決済連携
 * 収益化観点：実際の課金処理を担う最重要機能
 */
export class StripeService {
  private stripe: Stripe | null = null;
  private db = DatabaseService.getInstance().getDb();

  constructor() {
    this.initializeStripe();
    this.initializeStripeColumns();
  }

  /**
   * Stripe初期化
   */
  private initializeStripe(): void {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      console.warn('警告: STRIPE_SECRET_KEYが設定されていません。Stripe機能は無効です。');
    }
  }

  /**
   * subscriptionsテーブルにStripe関連カラムを追加
   * 注意：PlanServiceがテーブル作成するため、テーブル存在確認を行う
   */
  private initializeStripeColumns(): void {
    // テーブルが存在するか確認
    const tableExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions'")
      .get();

    if (!tableExists) {
      // テーブルが存在しない場合は後で作成される（PlanServiceが担当）
      return;
    }

    // カラムが存在しない場合のみ追加
    try {
      this.db.exec(`
        ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT
      `);
    } catch {
      // カラムが既に存在する場合は無視
    }

    try {
      this.db.exec(`
        ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT
      `);
    } catch {
      // カラムが既に存在する場合は無視
    }

    // インデックス作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust_id ON subscriptions(stripe_customer_id);
    `);
  }

  /**
   * Stripeが有効かチェック
   */
  isEnabled(): boolean {
    return this.stripe !== null;
  }

  /**
   * Stripeインスタンス取得（テスト用）
   */
  getStripeInstance(): Stripe | null {
    return this.stripe;
  }

  /**
   * Stripe Customer作成または取得
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // 既存のcustomer_idを検索
    const existing = this.db
      .prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?')
      .get(userId) as DbStripeInfo | undefined;

    if (existing?.stripe_customer_id) {
      return existing.stripe_customer_id;
    }

    // 新規Customer作成
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        userId,
      } as CustomerMetadata,
    });

    // DBに保存
    this.db
      .prepare(
        `
      UPDATE subscriptions SET stripe_customer_id = ?, updated_at = ? WHERE user_id = ?
    `
      )
      .run(customer.id, new Date().toISOString(), userId);

    return customer.id;
  }

  /**
   * Checkout Session作成
   * ユーザーを決済ページにリダイレクトするためのセッションを作成
   */
  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const { userId, email, plan, billingCycle, successUrl, cancelUrl } = request;

    // Freeプランは決済不要
    if (plan === 'free') {
      throw new Error('Free plan does not require payment');
    }

    // Price ID取得
    const priceId = STRIPE_PRICE_IDS[plan][billingCycle];
    if (!priceId) {
      throw new Error(`Price ID not found for plan: ${plan}, cycle: ${billingCycle}`);
    }

    // Customer取得または作成
    const customerId = await this.getOrCreateCustomer(userId, email);

    // Checkout Session作成
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Billing Portal Session作成
   * ユーザーが既存のサブスクリプションを管理するためのページ
   */
  async createBillingPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Customer ID取得
    const subscription = this.db
      .prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?')
      .get(userId) as DbStripeInfo | undefined;

    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * サブスクリプションキャンセル
   */
  async cancelSubscription(userId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Subscription ID取得
    const subscription = this.db
      .prepare('SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ?')
      .get(userId) as DbStripeInfo | undefined;

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No Stripe subscription found for this user');
    }

    // 期間終了時にキャンセル
    await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // DBを更新
    this.db
      .prepare(
        `
      UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE user_id = ?
    `
      )
      .run(new Date().toISOString(), userId);
  }

  /**
   * サブスクリプション即時キャンセル（返金なし）
   */
  async cancelSubscriptionImmediately(userId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Subscription ID取得
    const subscription = this.db
      .prepare('SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ?')
      .get(userId) as DbStripeInfo | undefined;

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No Stripe subscription found for this user');
    }

    // 即時キャンセル
    await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    // DBを更新
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE subscriptions SET plan = 'free', status = 'cancelled', updated_at = ? WHERE user_id = ?
    `
      )
      .run(now, userId);

    this.db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(userId);
  }

  /**
   * キャンセル予約を取り消し
   */
  async reactivateSubscription(userId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Subscription ID取得
    const subscription = this.db
      .prepare('SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ?')
      .get(userId) as DbStripeInfo | undefined;

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No Stripe subscription found for this user');
    }

    // キャンセル予約を取り消し
    await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // DBを更新
    this.db
      .prepare(
        `
      UPDATE subscriptions SET cancel_at_period_end = 0, updated_at = ? WHERE user_id = ?
    `
      )
      .run(new Date().toISOString(), userId);
  }

  /**
   * Webhook署名検証
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Webhook: checkout.session.completed
   * 支払い完了時の処理
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as PlanType | undefined;
    const subscriptionId = session.subscription as string | undefined;
    const customerId = session.customer as string | undefined;

    if (!userId || !plan || !subscriptionId) {
      console.error('Webhook: 必要なメタデータが不足しています', session.metadata);
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // サブスクリプション更新
    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET plan = ?, status = 'active',
          stripe_subscription_id = ?, stripe_customer_id = ?,
          current_period_start = ?, current_period_end = ?,
          cancel_at_period_end = 0, updated_at = ?
      WHERE user_id = ?
    `
      )
      .run(
        plan,
        subscriptionId,
        customerId,
        now.toISOString(),
        periodEnd.toISOString(),
        now.toISOString(),
        userId
      );

    // ユーザーテーブルも更新
    this.db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId);

    console.log(`Webhook: ユーザー ${userId} のプランを ${plan} にアップグレードしました`);
  }

  /**
   * Webhook: invoice.payment_succeeded
   * 継続課金成功時の処理
   */
  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // subscriptionはstringまたはExpandedなオブジェクト（Stripe API v2の型変更対応）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceAny = invoice as any;
    const subscriptionId =
      typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id;
    if (!subscriptionId) return;

    // サブスクリプション情報取得
    const subscription = this.db
      .prepare('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?')
      .get(subscriptionId) as { user_id: string } | undefined;

    if (!subscription) {
      console.error('Webhook: サブスクリプションが見つかりません', subscriptionId);
      return;
    }

    const periodEnd = invoice.lines.data[0]?.period?.end;
    if (periodEnd) {
      const periodEndDate = new Date(periodEnd * 1000).toISOString();

      this.db
        .prepare(
          `
        UPDATE subscriptions SET current_period_end = ?, status = 'active', updated_at = ?
        WHERE stripe_subscription_id = ?
      `
        )
        .run(periodEndDate, new Date().toISOString(), subscriptionId);
    }

    console.log(`Webhook: 継続課金成功 - サブスクリプション ${subscriptionId}`);
  }

  /**
   * Webhook: invoice.payment_failed
   * 支払い失敗時の処理
   */
  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // subscriptionはstringまたはExpandedなオブジェクト（Stripe API v2の型変更対応）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceAny = invoice as any;
    const subscriptionId =
      typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id;
    if (!subscriptionId) return;

    // サブスクリプションをpast_dueに更新
    this.db
      .prepare(
        `
      UPDATE subscriptions SET status = 'past_due', updated_at = ?
      WHERE stripe_subscription_id = ?
    `
      )
      .run(new Date().toISOString(), subscriptionId);

    console.log(`Webhook: 支払い失敗 - サブスクリプション ${subscriptionId}`);
  }

  /**
   * Webhook: customer.subscription.deleted
   * サブスクリプション削除時の処理
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const subscriptionId = subscription.id;

    // サブスクリプションをfreeに戻す
    const result = this.db
      .prepare(
        `
      UPDATE subscriptions SET plan = 'free', status = 'cancelled', updated_at = ?
      WHERE stripe_subscription_id = ?
    `
      )
      .run(new Date().toISOString(), subscriptionId);

    if (result.changes > 0) {
      // ユーザーテーブルも更新
      this.db
        .prepare(
          `
        UPDATE users SET plan = 'free'
        WHERE id IN (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?)
      `
        )
        .run(subscriptionId);
    }

    console.log(`Webhook: サブスクリプション削除 - ${subscriptionId}`);
  }

  /**
   * Webhook: customer.subscription.updated
   * サブスクリプション更新時の処理
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const subscriptionId = subscription.id;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const status = subscription.status;

    // ステータス変換
    let dbStatus: string;
    switch (status) {
      case 'active':
        dbStatus = 'active';
        break;
      case 'past_due':
        dbStatus = 'past_due';
        break;
      case 'canceled':
        dbStatus = 'cancelled';
        break;
      default:
        dbStatus = 'active';
    }

    // current_period_endはUNIXタイムスタンプ（秒）
    const currentPeriodEnd = (subscription as unknown as { current_period_end: number })
      .current_period_end;
    const periodEnd = new Date(currentPeriodEnd * 1000).toISOString();

    this.db
      .prepare(
        `
      UPDATE subscriptions
      SET status = ?, cancel_at_period_end = ?, current_period_end = ?, updated_at = ?
      WHERE stripe_subscription_id = ?
    `
      )
      .run(
        dbStatus,
        cancelAtPeriodEnd ? 1 : 0,
        periodEnd,
        new Date().toISOString(),
        subscriptionId
      );

    console.log(`Webhook: サブスクリプション更新 - ${subscriptionId}, status: ${status}`);
  }

  /**
   * Price ID一覧取得（フロントエンド向け）
   */
  getPriceIds(): Record<PlanType, { monthly: string; yearly: string }> {
    return STRIPE_PRICE_IDS;
  }

  /**
   * プラン価格情報取得（Stripeから動的取得）
   */
  async getPriceInfo(plan: PlanType): Promise<{
    monthly: { amount: number; currency: string };
    yearly: { amount: number; currency: string };
  } | null> {
    if (!this.stripe || plan === 'free') {
      return null;
    }

    const priceIds = STRIPE_PRICE_IDS[plan];

    try {
      const [monthlyPrice, yearlyPrice] = await Promise.all([
        priceIds.monthly ? this.stripe.prices.retrieve(priceIds.monthly) : null,
        priceIds.yearly ? this.stripe.prices.retrieve(priceIds.yearly) : null,
      ]);

      return {
        monthly: {
          amount: monthlyPrice?.unit_amount ?? PLANS[plan].price * 100,
          currency: monthlyPrice?.currency ?? 'jpy',
        },
        yearly: {
          amount: yearlyPrice?.unit_amount ?? PLANS[plan].yearlyPrice * 100,
          currency: yearlyPrice?.currency ?? 'jpy',
        },
      };
    } catch (error) {
      console.error('Stripe価格取得エラー:', error);
      return null;
    }
  }
}
