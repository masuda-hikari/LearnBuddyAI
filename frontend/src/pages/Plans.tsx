// プラン選択ページ

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import plansApi from '../api/plans';
import type { Plan } from '../api/plans';

const Plans: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await plansApi.getPlans();
        setPlans(data);
      } catch (err) {
        console.error('プラン取得エラー:', err);
        setError('プラン情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      return; // 無料プランは選択不要
    }

    setIsProcessing(true);
    setError('');

    try {
      const { url } = await plansApi.createCheckoutSession(planId, billingCycle);
      window.location.href = url;
    } catch (err) {
      console.error('チェックアウトエラー:', err);
      setError('決済ページへの移動に失敗しました');
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const { url } = await plansApi.createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error('ポータルエラー:', err);
      setError('サブスクリプション管理ページへの移動に失敗しました');
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('本当にサブスクリプションをキャンセルしますか？')) {
      return;
    }

    setIsProcessing(true);
    try {
      await plansApi.cancelSubscription();
      if (user) {
        updateUser({ ...user, plan: 'free' });
      }
      alert('サブスクリプションがキャンセルされました');
    } catch (err) {
      console.error('キャンセルエラー:', err);
      setError('キャンセルに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="plans-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['1日5つの質問', '基本レッスン', '学習進捗の記録'],
      limits: { dailyQuestions: 5, lessonsAccess: 'basic', analytics: false, priority: false },
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 980,
      features: ['無制限の質問', '全レッスンへのアクセス', '詳細な学習分析', '広告なし', '優先サポート'],
      limits: { dailyQuestions: -1, lessonsAccess: 'all', analytics: true, priority: true },
    },
    {
      id: 'education',
      name: 'Education',
      price: 0,
      features: ['学校・塾向け', '複数ユーザー管理', 'カスタムカリキュラム', '専用サポート'],
      limits: { dailyQuestions: -1, lessonsAccess: 'all', analytics: true, priority: true },
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="plans-page">
      <div className="plans-header">
        <h1>料金プラン</h1>
        <p>あなたの学習スタイルに合ったプランを選択してください</p>

        <div className="billing-toggle">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            月額
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            年額（2ヶ月分お得）
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="plans-grid">
        {displayPlans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${user?.plan === plan.id ? 'current' : ''} ${plan.id === 'premium' ? 'featured' : ''}`}
          >
            {plan.id === 'premium' && <div className="featured-badge">おすすめ</div>}

            <div className="plan-header">
              <h2>{plan.name}</h2>
              <div className="plan-price">
                {plan.price === 0 ? (
                  <span className="price-free">無料</span>
                ) : (
                  <>
                    <span className="price-amount">
                      ¥{billingCycle === 'yearly' ? plan.price * 10 : plan.price}
                    </span>
                    <span className="price-period">
                      /{billingCycle === 'yearly' ? '年' : '月'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ul className="plan-features">
              {plan.features.map((feature, index) => (
                <li key={index}>
                  <span className="feature-check">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="plan-action">
              {user?.plan === plan.id ? (
                <button className="btn btn-secondary" disabled>
                  現在のプラン
                </button>
              ) : plan.id === 'education' ? (
                <button className="btn btn-outline">お問い合わせ</button>
              ) : plan.id === 'free' ? (
                <button className="btn btn-outline" disabled={user?.plan !== 'free'}>
                  無料プラン
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? '処理中...' : 'アップグレード'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {user?.plan !== 'free' && (
        <div className="subscription-management">
          <h3>サブスクリプション管理</h3>
          <div className="management-actions">
            <button
              className="btn btn-secondary"
              onClick={handleManageSubscription}
              disabled={isProcessing}
            >
              支払い方法を管理
            </button>
            <button
              className="btn btn-danger"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
            >
              サブスクリプションをキャンセル
            </button>
          </div>
        </div>
      )}

      <div className="plans-faq">
        <h3>よくある質問</h3>
        <div className="faq-item">
          <h4>いつでもキャンセルできますか？</h4>
          <p>はい、いつでもキャンセル可能です。キャンセル後も請求期間終了まではご利用いただけます。</p>
        </div>
        <div className="faq-item">
          <h4>支払い方法は？</h4>
          <p>クレジットカード（Visa, Mastercard, Amex）に対応しています。Stripeによる安全な決済です。</p>
        </div>
        <div className="faq-item">
          <h4>Educationプランとは？</h4>
          <p>学校や塾向けの団体プランです。詳細はお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
};

export default Plans;
