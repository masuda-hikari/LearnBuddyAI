// ホームページ（ランディングページ）

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>AIがあなたの英語学習をサポート</h1>
          <p className="hero-subtitle">
            LearnBuddyAIは、1対1の個別指導を模擬したAIチューターです。
            いつでも、どこでも、あなたのペースで学習できます。
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  無料で始める
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  ログイン
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-illustration">📚🤖</div>
        </div>
      </section>

      <section className="features">
        <h2>LearnBuddyAIの特徴</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AIチューター</h3>
            <p>
              英語学習に関するあらゆる質問にAIがお答えします。
              文法、語彙、発音、なんでも聞いてください。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">❓</div>
            <h3>インタラクティブクイズ</h3>
            <p>
              理解度を確認するクイズで、知識を定着させましょう。
              即時フィードバックで効率的に学習できます。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>進捗トラッキング</h3>
            <p>
              学習の進捗を可視化。どこが得意で、どこを強化すべきか、
              一目でわかります。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>パーソナライズド学習</h3>
            <p>
              あなたの弱点に基づいた学習プランを自動生成。
              効率的に英語力を伸ばせます。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>スペースドリピティション</h3>
            <p>
              科学的に証明された間隔反復法で、
              記憶の定着を最大化します。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>いつでも利用可能</h3>
            <p>
              24時間365日、AIチューターがあなたをサポート。
              自分のペースで学習を進められます。
            </p>
          </div>
        </div>
      </section>

      <section className="pricing-preview">
        <h2>シンプルな料金体系</h2>
        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Free</h3>
            <div className="price">¥0<span>/月</span></div>
            <ul>
              <li>1日5つの質問</li>
              <li>基本レッスン</li>
              <li>進捗トラッキング</li>
            </ul>
            <Link to="/register" className="btn btn-outline">
              無料で始める
            </Link>
          </div>

          <div className="pricing-card featured">
            <div className="featured-label">おすすめ</div>
            <h3>Premium</h3>
            <div className="price">¥980<span>/月</span></div>
            <ul>
              <li>無制限の質問</li>
              <li>全レッスンへのアクセス</li>
              <li>詳細な学習分析</li>
              <li>広告なし</li>
              <li>優先サポート</li>
            </ul>
            <Link to="/register" className="btn btn-primary">
              今すぐ始める
            </Link>
          </div>

          <div className="pricing-card">
            <h3>Education</h3>
            <div className="price">お問い合わせ</div>
            <ul>
              <li>学校・塾向け</li>
              <li>複数ユーザー管理</li>
              <li>カスタムカリキュラム</li>
              <li>専用サポート</li>
            </ul>
            <button className="btn btn-outline">お問い合わせ</button>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>今すぐ英語学習を始めましょう</h2>
        <p>無料プランで始めて、いつでもアップグレードできます</p>
        <Link to="/register" className="btn btn-primary btn-large">
          無料で始める
        </Link>
      </section>
    </div>
  );
};

export default Home;
