// プランAPI

import apiClient from './client';

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    dailyQuestions: number;
    lessonsAccess: 'basic' | 'all';
    analytics: boolean;
    priority: boolean;
  };
}

export interface Subscription {
  planId: string;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodEnd: string;
}

export interface CheckoutSession {
  url: string;
}

export const plansApi = {
  // プラン一覧取得
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get('/api/plans');
    return response.data;
  },

  // 現在のプラン取得
  async getCurrentPlan(): Promise<{ plan: Plan; subscription?: Subscription }> {
    const response = await apiClient.get('/api/plans/current');
    return response.data;
  },

  // Stripe Checkout Session作成
  async createCheckoutSession(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<CheckoutSession> {
    const response = await apiClient.post('/api/stripe/create-checkout-session', {
      planId,
      billingCycle,
    });
    return response.data;
  },

  // Stripe Billing Portal Session作成
  async createPortalSession(): Promise<{ url: string }> {
    const response = await apiClient.post('/api/stripe/create-portal-session');
    return response.data;
  },

  // サブスクリプションキャンセル
  async cancelSubscription(): Promise<void> {
    await apiClient.post('/api/stripe/cancel-subscription');
  },

  // 価格情報取得
  async getPriceInfo(plan: string): Promise<{ monthly: number; yearly: number }> {
    const response = await apiClient.get(`/api/stripe/price-info/${plan}`);
    return response.data;
  },
};

export default plansApi;
