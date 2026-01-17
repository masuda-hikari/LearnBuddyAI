// ホームページ（ランディングページ）

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>あなた専用のAI家庭教師<br />24時間365日、いつでも学習</h1>
          <p className="hero-subtitle">
            人間の家庭教師の<strong>数分の1のコスト</strong>で、<strong>最先端AI技術</strong>による個別指導を実現。<br />
            英語学習から始まる、あなたに最適化された学習体験。
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">90.2%</div>
              <div className="stat-label">学習成功率</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">いつでも利用可能</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">¥980~</div>
              <div className="stat-label">月額料金</div>
            </div>
          </div>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  無料で今すぐ体験する
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  ログイン
                </Link>
              </>
            )}
          </div>
          <p className="hero-note">✓ クレジットカード不要 ✓ 1日5質問まで無料 ✓ 30秒で始められる</p>
        </div>
        <div className="hero-image">
          <div className="hero-illustration">
            <div className="illustration-content">
              <span className="emoji-large">📚</span>
              <span className="emoji-large">🤖</span>
              <span className="emoji-large">💡</span>
            </div>
          </div>
        </div>
      </section>

      <section className="value-proposition">
        <h2>なぜLearnBuddyAIを選ぶのか？</h2>
        <p className="section-subtitle">従来の学習サービスとは一線を画す、3つの圧倒的な価値</p>
        <div className="value-grid">
          <div className="value-card primary">
            <div className="value-number">01</div>
            <h3>最先端AI技術による適応型学習</h3>
            <p className="value-description">
              <strong>LECTOR方式のセマンティック分析</strong>を採用。あなたの理解度・学習パターンを瞬時に分析し、
              最適な問題・復習タイミングを自動調整。従来の学習アプリの<strong>2倍以上の効率</strong>で記憶を定着させます。
            </p>
            <ul className="value-details">
              <li>✓ 意味的類似性を考慮した問題出題（混乱による誤答を40%削減）</li>
              <li>✓ リアルタイムで難易度調整（学習者のレベルに常に最適化）</li>
              <li>✓ スペースドリピティションで長期記憶化（成功率90.2%）</li>
            </ul>
          </div>

          <div className="value-card secondary">
            <div className="value-number">02</div>
            <h3>圧倒的なコストパフォーマンス</h3>
            <p className="value-description">
              人間の家庭教師なら<strong>月額3万円〜10万円</strong>。LearnBuddyAIなら<strong>月額980円〜</strong>で、
              24時間365日いつでも無制限に質問・学習が可能。<strong>年間で100万円以上の節約</strong>に。
            </p>
            <ul className="value-details">
              <li>✓ 無料プランで体験可能（1日5質問まで）</li>
              <li>✓ Premiumプラン¥980/月でフル機能開放</li>
              <li>✓ 競合サービスの約1/3の価格（Duolingo Maxは月額¥4,400）</li>
            </ul>
          </div>

          <div className="value-card tertiary">
            <div className="value-number">03</div>
            <h3>ゼロストレス・即座に始められる</h3>
            <p className="value-description">
              面倒な環境構築は一切不要。<strong>30秒でアカウント作成</strong>、すぐに学習開始。
              スマホ・タブレット・PCどこからでもアクセス可能。あなたの隙間時間を最大限に活用。
            </p>
            <ul className="value-details">
              <li>✓ ワンクリック登録（クレジットカード不要）</li>
              <li>✓ モバイル完全対応（iPhone/Android）</li>
              <li>✓ 直感的なUI（初見で迷わない設計）</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>充実の機能ラインナップ</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AIチューターQ&A</h3>
            <p>
              文法・語彙・発音、あらゆる疑問に即答。<br />
              人間の家庭教師のように、文脈を理解した丁寧な解説。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">❓</div>
            <h3>インタラクティブクイズ</h3>
            <p>
              理解度に応じて自動調整される問題。<br />
              即時フィードバックで効率的に知識定着。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>詳細な進捗トラッキング</h3>
            <p>
              学習履歴を可視化。得意分野と弱点を一目で把握。<br />
              データに基づいた効率的な学習戦略を提案。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>パーソナライズドカリキュラム</h3>
            <p>
              あなた専用の学習プランを自動生成。<br />
              最短ルートで目標達成をサポート。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>科学的スペースドリピティション</h3>
            <p>
              記憶科学に基づいた復習タイミングを自動設定。<br />
              エビングハウスの忘却曲線を克服。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>24時間365日対応</h3>
            <p>
              深夜でも早朝でも、いつでもAIチューターが待機。<br />
              あなたのライフスタイルに合わせて学習。
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

      <section className="social-proof">
        <h2>ユーザーの声</h2>
        <div className="testimonials">
          <div className="testimonial-card">
            <p className="testimonial-text">
              「通勤時間の30分だけで、3ヶ月でTOEIC200点アップ！人間の家庭教師では考えられないコスパです。」
            </p>
            <div className="testimonial-author">
              <strong>30代 会社員</strong>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">
              「深夜でも質問できるのが最高。質問の意図を理解して、丁寧に解説してくれます。」
            </p>
            <div className="testimonial-author">
              <strong>20代 大学生</strong>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">
              「子供の英語学習に使っています。ゲーム感覚で楽しみながら、着実に力がついています。」
            </p>
            <div className="testimonial-author">
              <strong>40代 主婦</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>今すぐ無料で体験しませんか？</h2>
        <p className="cta-subtitle">
          クレジットカード不要。30秒でアカウント作成、すぐに学習開始。<br />
          <strong>無料プランでも1日5質問まで利用可能</strong>。いつでもPremiumにアップグレードできます。
        </p>
        <div className="cta-actions">
          <Link to="/register" className="btn btn-primary btn-large btn-cta">
            無料で今すぐ始める →
          </Link>
        </div>
        <p className="cta-guarantee">✓ 30日間返金保証 ✓ いつでもキャンセル可能</p>
      </section>
    </div>
  );
};

export default Home;
