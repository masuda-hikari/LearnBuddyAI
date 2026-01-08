// ダッシュボードページ

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import learningApi from '../api/learning';
import type { Progress } from '../api/learning';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await learningApi.getProgress();
        setProgress(data);
      } catch (err) {
        console.error('進捗取得エラー:', err);
        setError('進捗情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>ようこそ、{user?.name || 'ゲスト'}さん！</h1>
        <p className="plan-info">
          現在のプラン: <span className={`plan-badge plan-${user?.plan}`}>{user?.plan}</span>
          {user?.plan === 'free' && (
            <Link to="/plans" className="upgrade-link">
              アップグレード
            </Link>
          )}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <div className="stat-value">
              {progress?.completedLessons || 0} / {progress?.totalLessons || 0}
            </div>
            <div className="stat-label">完了レッスン</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">
              {progress?.correctQuizzes || 0} / {progress?.totalQuizzes || 0}
            </div>
            <div className="stat-label">正解クイズ</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{progress?.streakDays || 0}日</div>
            <div className="stat-label">連続学習</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">
              {progress?.lastStudyDate
                ? new Date(progress.lastStudyDate).toLocaleDateString('ja-JP')
                : '-'}
            </div>
            <div className="stat-label">最終学習日</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>今日の学習</h2>
        <div className="action-cards">
          <Link to="/learn" className="action-card">
            <div className="action-icon">📚</div>
            <div className="action-content">
              <h3>レッスン</h3>
              <p>新しいことを学ぼう</p>
            </div>
          </Link>

          <Link to="/quiz" className="action-card">
            <div className="action-icon">❓</div>
            <div className="action-content">
              <h3>クイズ</h3>
              <p>知識をテストしよう</p>
            </div>
          </Link>

          <Link to="/ask" className="action-card">
            <div className="action-icon">💬</div>
            <div className="action-content">
              <h3>AIに質問</h3>
              <p>何でも聞いてください</p>
            </div>
          </Link>
        </div>
      </div>

      {user?.plan === 'free' && (
        <div className="upgrade-banner">
          <div className="banner-content">
            <h3>Premiumにアップグレード</h3>
            <p>無制限の質問、全レッスンへのアクセス、詳細な分析機能</p>
            <Link to="/plans" className="btn btn-primary">
              プランを見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
