# LearnBuddyAI - AIパーソナルチューター

継承: O:\Dev\CLAUDE.md → このファイル

## プロジェクト概要

**LearnBuddyAI**は、1対1の個別指導を模倣するAIチューターシステム。
初期フォーカス: **英語語彙学習**（パイロット版）

### ビジョン
- いつでも利用可能なAI家庭教師
- ユーザーの進捗に応じた適応型学習
- 人間の家庭教師の数分の1のコストで高品質な教育提供

---

## 機能計画

### コア機能
| 機能 | 説明 | 優先度 |
|------|------|--------|
| Q&Aチャットボット | 自由質問への回答 | P0 |
| インタラクティブクイズ | 理解度確認・練習問題 | P0 |
| 進捗トラッキング | ユーザーの学習履歴管理 | P1 |
| パーソナライズカリキュラム | 弱点に基づく学習計画生成 | P1 |
| スペースドリピティション | 記憶定着のための間隔反復 | P2 |

### 将来拡張
- 音声入出力（発音練習）
- 複数科目対応（数学、プログラミング等）
- ビデオレッスン統合
- 人間チューターとの連携機能

---

## 技術スタック

```
backend/          # Node.js + TypeScript
├── src/
│   ├── server.ts         # Expressサーバー
│   ├── routes/           # APIエンドポイント
│   ├── services/         # ビジネスロジック
│   │   ├── ai.ts         # LLM API統合
│   │   ├── lesson.ts     # レッスン管理
│   │   └── user.ts       # ユーザー管理
│   ├── models/           # データモデル
│   └── utils/            # ユーティリティ
├── package.json
└── tsconfig.json

frontend/         # 将来のWeb UI
content/          # 教育コンテンツ（語彙リスト等）
tests/            # テストスイート
docs/             # APIドキュメント
```

### 依存関係
```json
{
  "express": "^4.18",
  "typescript": "^5.0",
  "openai": "^4.0",        // または @anthropic-ai/sdk
  "sqlite3": "^5.1",       // 初期はSQLite
  "jest": "^29.0"          // テスト
}
```

---

## 収益化戦略

### 料金プラン

| プラン | 価格 | 機能 |
|--------|------|------|
| **Free** | ¥0 | 1日5質問、基本レッスン、広告表示 |
| **Premium** | ¥980/月 | 無制限質問、全レッスン、広告なし、進捗分析 |
| **Education** | 要問合せ | 学校・塾向けライセンス、管理機能、一括契約 |

### 収益ストリーム
1. **サブスクリプション**: メイン収益源
2. **教育機関ライセンス**: B2B契約
3. **プレミアムコンテンツ**: 専門科目の追加購入
4. **紹介プログラム**: ユーザー獲得インセンティブ

### 実装要件
- ユーザー認証システム（JWT）
- 利用制限カウンター（Free tier）
- 決済連携（Stripe/PayPal - 将来）
- プラン別機能フラグ

---

## 開発計画

### Phase 1: 基盤構築
- [ ] プロジェクト構造セットアップ
- [ ] 基本APIサーバー実装
- [ ] LLM API統合（Q&A機能）
- [ ] シンプルなユーザー管理

### Phase 2: 学習機能
- [ ] レッスンフロー実装（Word of the Day等）
- [ ] クイズシステム
- [ ] 進捗保存（SQLite）
- [ ] スペースドリピティション基礎

### Phase 3: パーソナライゼーション
- [ ] 学習履歴分析
- [ ] 弱点検出・強化学習
- [ ] カスタムカリキュラム生成
- [ ] 適応型難易度調整

### Phase 4: 製品化
- [ ] ユーザー認証（JWT）
- [ ] 料金プラン実装
- [ ] Web UI開発
- [ ] 決済連携

### Phase 5: スケール
- [ ] 複数科目追加
- [ ] モバイルアプリ
- [ ] 音声機能
- [ ] 教育機関向け機能

---

## API設計（初期）

```typescript
// Q&A
POST /api/ask
{ "question": string, "context"?: string }
→ { "answer": string, "sources"?: string[] }

// レッスン
GET  /api/lessons              // レッスン一覧
GET  /api/lessons/:id          // レッスン詳細
POST /api/lessons/:id/complete // 完了記録

// クイズ
GET  /api/quiz/:topic          // クイズ取得
POST /api/quiz/submit          // 回答提出

// ユーザー
POST /api/users/register
POST /api/users/login
GET  /api/users/progress
```

---

## 品質保証

### テスト戦略
- 単体テスト: 各サービス関数
- 統合テスト: APIエンドポイント
- E2Eテスト: ユーザーフロー全体

### 品質指標
- 回答精度: AIレスポンスの正確性監視
- ユーザー満足度: フィードバック収集
- 学習効果: 進捗データ分析

---

## 環境変数

```env
# サーバー設定
PORT=3000
NODE_ENV=development

# AI API
OPENAI_API_KEY=sk-...
# または
ANTHROPIC_API_KEY=sk-ant-...

# データベース
DATABASE_URL=./data/learnbuddy.db

# 認証（将来）
JWT_SECRET=your-secret-key
```

---

## 禁止事項

- APIキーのハードコード
- ユーザーデータの平文保存
- 未テストコードのデプロイ
- Free tierの制限バイパス許可

---

## セッション開始時チェック

1. [ ] このCLAUDE.md確認
2. [ ] 環境変数設定確認
3. [ ] 依存関係インストール状況確認
4. [ ] 現在のPhase・タスク確認
