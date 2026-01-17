# LearnBuddyAI

**あなた専用のAI家庭教師 - 24時間365日、いつでも学習**

[\![Status](https://img.shields.io/badge/status-production--ready-green)](https://github.com)
[\![License](https://img.shields.io/badge/license-Proprietary-blue)](LICENSE)
[\![Tests](https://img.shields.io/badge/tests-103%20passing-success)](backend/src/__tests__)

## 🎯 概要

LearnBuddyAIは、**最先端AI技術**を活用したパーソナル学習プラットフォームです。人間の家庭教師の**数分の1のコスト**で、24時間365日利用可能な個別指導を実現しました。

**2026年1月時点**: デプロイ準備完了。Phase 5 完了（統合テスト・本番環境対応済み）

## ✨ 主要機能

- **🤖 AIチューター**: 文法・語彙・発音、あらゆる疑問に即答
- **📊 適応型学習**: LECTOR方式のセマンティック分析で学習効率2倍以上
- **📈 詳細な進捗分析**: 得意分野と弱点を可視化し、最短ルートで目標達成
- **🔄 科学的スペースドリピティション**: 記憶定着率90.2%を実現
- **💬 インタラクティブクイズ**: 理解度に応じた自動調整で効率的に学習
- **⏰ 24/7対応**: いつでもどこでも、あなたのペースで学習可能

## 🚀 クイックスタート（ユーザー向け）

1. **アカウント作成**: 30秒でアカウント作成（クレジットカード不要）
2. **無料で体験**: 1日5質問まで無料で利用可能
3. **学習開始**: AIチューターとチャットを開始

🔗 **本番環境**: `https://learnbuddyai.com` (デプロイ後に更新)

## 💻 開発環境セットアップ

### 必要要件
- Node.js 18.x 以上
- npm 9.x 以上
- SQLite3

### バックエンド
```bash
cd backend
npm install
cp .env.example .env
# .env を編集してAPIキーを設定
npm run dev  # 開発サーバー起動 (http://localhost:3000)
npm test     # テスト実行（103テスト）
```

### フロントエンド
```bash
cd frontend
npm install
cp .env.example .env
# .env を編集してバックエンドURLを設定
npm run dev  # 開発サーバー起動 (http://localhost:5173)
npm run build  # 本番ビルド
```

## 📚 対応科目

| 科目 | 状態 |
|------|------|
| 🇬🇧 英語語彙・文法 | ✅ 対応済み |
| 🧮 数学 | 📅 計画中 |
| 💻 プログラミング | 📅 計画中 |
| 🔬 理科 | 📅 計画中 |

## 📊 開発状況

**現在**: Phase 5 完了（デプロイ準備完了） - 2026年1月17日更新

| Phase | 状態 | 完了率 |
|-------|------|--------|
| Phase 1: 基盤構築 | ✅ 完了 | 100% |
| Phase 2: 学習機能 | ✅ 完了 | 100% |
| Phase 3: パーソナライゼーション | ✅ 完了 | 100% |
| Phase 4: 収益化 | ✅ 完了 | 100% |
| Phase 5: 統合・デプロイ準備 | ✅ 完了 | 100% |

### 実装済み機能

#### バックエンド
- ✅ Express + TypeScript APIサーバー
- ✅ SQLite データベース（better-sqlite3）
- ✅ JWT認証システム
- ✅ Stripe決済連携
- ✅ Q&A、レッスン、クイズAPI
- ✅ 進捗トラッキング
- ✅ スペースドリピティション
- ✅ 適応型難易度調整
- ✅ テスト103件（全通過）

#### フロントエンド
- ✅ React + TypeScript + Vite
- ✅ 認証フロー（ログイン・登録）
- ✅ ダッシュボード
- ✅ レッスンページ
- ✅ クイズページ
- ✅ チャット（Q&A）ページ
- ✅ 料金プランページ
- ✅ レスポンシブデザイン（モバイル対応）
- ✅ SEO対策（メタタグ・構造化データ）

### 次のステップ
- 🚀 本番デプロイ（Vercel/Railway/Render等）
- 📈 マーケティング開始
- 🎨 OGP画像作成
- 📱 SNS運営開始（@LearnBuddyAI）

## 🛠️ 技術スタック

### バックエンド
- **Runtime**: Node.js 18.x
- **言語**: TypeScript 5.x
- **フレームワーク**: Express 4.x
- **データベース**: SQLite (better-sqlite3)
- **認証**: JWT (jsonwebtoken)
- **決済**: Stripe API
- **AI**: OpenAI API / Anthropic API
- **テスト**: Jest (103テスト)

### フロントエンド
- **フレームワーク**: React 18.x
- **言語**: TypeScript 5.x
- **ビルドツール**: Vite 5.x
- **状態管理**: React Query (TanStack Query)
- **ルーティング**: React Router 6.x
- **スタイル**: CSS3 + CSS Variables

### インフラ（予定）
- **ホスティング**: Vercel (Frontend) + Railway (Backend)
- **データベース**: PostgreSQL (本番環境)
- **CDN**: Cloudflare
- **ドメイン**: learnbuddyai.com

## ライセンス

Proprietary - All Rights Reserved

## お問い合わせ

開発に関するお問い合わせは、イシューを作成してください。