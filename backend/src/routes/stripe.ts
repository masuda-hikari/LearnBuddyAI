import { Router, Request, Response, raw } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const stripeService = new StripeService();

/**
 * Stripe利用可否チェック
 */
router.get('/status', (_req: Request, res: Response): void => {
  res.json({
    enabled: stripeService.isEnabled(),
    message: stripeService.isEnabled()
      ? 'Stripe is configured and ready'
      : 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable.',
  });
});

/**
 * Checkout Session作成
 * POST /api/stripe/create-checkout-session
 */
router.post(
  '/create-checkout-session',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        res.status(503).json({ error: 'Stripe is not configured' });
        return;
      }

      const { plan, billingCycle, successUrl, cancelUrl } = req.body;

      if (!plan || !billingCycle || !successUrl || !cancelUrl) {
        res.status(400).json({
          error: 'plan, billingCycle, successUrl, cancelUrl are required',
        });
        return;
      }

      if (!['premium', 'education'].includes(plan)) {
        res.status(400).json({ error: 'Invalid plan. Must be premium or education' });
        return;
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        res.status(400).json({ error: 'Invalid billingCycle. Must be monthly or yearly' });
        return;
      }

      const session = await stripeService.createCheckoutSession({
        userId: req.user!.userId,
        email: req.user!.email,
        plan,
        billingCycle,
        successUrl,
        cancelUrl,
      });

      res.json(session);
    } catch (error) {
      console.error('Checkout session error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  }
);

/**
 * Billing Portal Session作成
 * POST /api/stripe/create-portal-session
 */
router.post(
  '/create-portal-session',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        res.status(503).json({ error: 'Stripe is not configured' });
        return;
      }

      const { returnUrl } = req.body;

      if (!returnUrl) {
        res.status(400).json({ error: 'returnUrl is required' });
        return;
      }

      const session = await stripeService.createBillingPortalSession(req.user!.userId, returnUrl);

      res.json(session);
    } catch (error) {
      console.error('Portal session error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      });
    }
  }
);

/**
 * サブスクリプションキャンセル（期間終了時）
 * POST /api/stripe/cancel-subscription
 */
router.post(
  '/cancel-subscription',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        res.status(503).json({ error: 'Stripe is not configured' });
        return;
      }

      await stripeService.cancelSubscription(req.user!.userId);

      res.json({
        success: true,
        message: 'Subscription will be cancelled at the end of the billing period',
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  }
);

/**
 * キャンセル予約取り消し
 * POST /api/stripe/reactivate-subscription
 */
router.post(
  '/reactivate-subscription',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        res.status(503).json({ error: 'Stripe is not configured' });
        return;
      }

      await stripeService.reactivateSubscription(req.user!.userId);

      res.json({
        success: true,
        message: 'Subscription has been reactivated',
      });
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      });
    }
  }
);

/**
 * Price ID一覧取得
 * GET /api/stripe/prices
 */
router.get('/prices', (_req: Request, res: Response): void => {
  res.json(stripeService.getPriceIds());
});

/**
 * プラン価格情報取得（動的）
 * GET /api/stripe/price-info/:plan
 */
router.get('/price-info/:plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { plan } = req.params;

    if (!['premium', 'education'].includes(plan)) {
      res.status(400).json({ error: 'Invalid plan' });
      return;
    }

    const priceInfo = await stripeService.getPriceInfo(plan as 'premium' | 'education');

    if (!priceInfo) {
      res.status(503).json({ error: 'Unable to fetch price information' });
      return;
    }

    res.json(priceInfo);
  } catch (error) {
    console.error('Price info error:', error);
    res.status(500).json({ error: 'Failed to fetch price information' });
  }
});

/**
 * Stripe Webhook
 * POST /api/stripe/webhook
 *
 * 重要: このエンドポイントはraw bodyが必要
 * server.tsでraw bodyパーサーを設定する必要がある
 */
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripeService.constructWebhookEvent(req.body, signature as string);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // イベント処理
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await stripeService.handleCheckoutCompleted(session);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await stripeService.handleInvoicePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await stripeService.handleInvoicePaymentFailed(invoice);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await stripeService.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await stripeService.handleSubscriptionUpdated(subscription);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

export default router;
