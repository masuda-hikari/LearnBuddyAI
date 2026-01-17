# デプロイ手順書 - LearnBuddyAI

**最終更新**: 2026年1月17日

## 前提条件

- GitHubアカウント
- Vercelアカウント（フロントエンド用）
- Railwayアカウント（バックエンド用）
- Stripeアカウント（決済用）
- ドメイン（推奨: Cloudflare経由）

---

## Phase 1: バックエンドデプロイ（Railway）

### 1.1 Railway準備

```bash
# Railway CLI インストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

### 1.2 環境変数設定

Railwayダッシュボードで以下を設定:

```env
# サーバー設定
NODE_ENV=production
PORT=3000

# AI API（どちらか一方）
OPENAI_API_KEY=sk-...
# または
ANTHROPIC_API_KEY=sk-ant-...

# データベース（Railwayが自動設定）
DATABASE_URL=postgresql://...

# 認証
JWT_SECRET=<ランダムな長い文字列>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS設定
FRONTEND_URL=https://learnbuddyai.com
```

### 1.3 PostgreSQLへの移行

```bash
# Railwayでpostgresサービス追加
railway add postgresql

# マイグレーションスクリプト実行（本番環境）
railway run npm run migrate
```

**注意**: SQLiteから PostgreSQLへの移行が必要。`backend/src/db.ts`を更新:

```typescript
// SQLite (開発)
import Database from 'better-sqlite3';

// PostgreSQL (本番) - pg-promiseに変更
import pgPromise from 'pg-promise';
const pgp = pgPromise();
const db = pgp(process.env.DATABASE_URL);
```

### 1.4 デプロイ実行

```bash
cd backend
railway up
```

デプロイ後、Railway URLを確認:
```
https://learnbuddyai-backend-production.up.railway.app
```

---

## Phase 2: フロントエンドデプロイ（Vercel）

### 2.1 Vercel準備

```bash
# Vercel CLI インストール
npm install -g vercel

# ログイン
vercel login

# プロジェクトリンク
cd frontend
vercel
```

### 2.2 環境変数設定

Vercelダッシュボードで以下を設定:

```env
# バックエンドURL
VITE_API_URL=https://learnbuddyai-backend-production.up.railway.app

# Stripe公開鍵
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### 2.3 ビルド設定

Vercelの設定:
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 2.4 デプロイ実行

```bash
vercel --prod
```

デプロイ後、Vercel URLを確認:
```
https://learnbuddyai.vercel.app
```

---

## Phase 3: ドメイン設定

### 3.1 Cloudflare DNS設定

1. Cloudflareでドメイン登録（無料）
2. DNS レコード追加:

```
# フロントエンド
Type: CNAME
Name: @ (または www)
Target: cname.vercel-dns.com

# バックエンド（オプション: カスタムドメイン）
Type: CNAME
Name: api
Target: learnbuddyai-backend-production.up.railway.app
```

3. SSL/TLS設定: `Full (strict)`を選択

### 3.2 Vercel カスタムドメイン追加

1. Vercel Dashboard → Settings → Domains
2. `learnbuddyai.com` を追加
3. DNS検証を待つ（数分）

### 3.3 Railway カスタムドメイン追加（オプション）

1. Railway Dashboard → Settings → Domains
2. `api.learnbuddyai.com` を追加

---

## Phase 4: Stripe設定

### 4.1 商品・価格の作成

Stripeダッシュボード → Products:

1. **Basic プラン**
   - 名前: LearnBuddyAI Basic
   - 価格: ¥980 / 月
   - Recurring: Yes

2. **Premium プラン**
   - 名前: LearnBuddyAI Premium
   - 価格: ¥2,980 / 月
   - Recurring: Yes

3. **Pro プラン**
   - 名前: LearnBuddyAI Pro
   - 価格: ¥9,800 / 月
   - Recurring: Yes

### 4.2 Webhook設定

1. Stripeダッシュボード → Developers → Webhooks
2. Endpoint追加:
   ```
   https://api.learnbuddyai.com/api/stripe/webhook
   ```
3. イベント選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

4. Webhook Secretをコピーして環境変数に設定

---

## Phase 5: 動作確認

### 5.1 フロントエンド確認

- [ ] https://learnbuddyai.com が正常に表示される
- [ ] ログイン・登録が動作する
- [ ] ダッシュボードにアクセスできる
- [ ] レスポンシブデザインが動作する（モバイル確認）

### 5.2 バックエンド確認

```bash
# Health check
curl https://api.learnbuddyai.com/health

# API動作確認
curl https://api.learnbuddyai.com/api/lessons
```

### 5.3 決済フロー確認

1. テストモードで決済テスト
2. 本番モードに切り替え
3. 実際のカードで小額テスト（自分で購入して返金）

---

## Phase 6: 監視・ログ

### 6.1 Railway ログ確認

```bash
railway logs
```

### 6.2 Vercel ログ確認

Vercel Dashboard → Logs

### 6.3 エラートラッキング（推奨）

Sentry導入:
```bash
npm install @sentry/react @sentry/node
```

---

## トラブルシューティング

### CORS エラー

バックエンド `.env` で `FRONTEND_URL` を確認:
```env
FRONTEND_URL=https://learnbuddyai.com
```

### 環境変数が反映されない

- Railway: `railway restart`
- Vercel: `vercel --prod` で再デプロイ

### データベース接続エラー

DATABASE_URLが正しいか確認:
```bash
railway variables
```

---

## ロールバック手順

### Vercel
```bash
vercel rollback
```

### Railway
Railway Dashboard → Deployments → 前のバージョンを選択 → Redeploy

---

## セキュリティチェックリスト

- [ ] 全APIキーは環境変数に保存（ハードコードなし）
- [ ] JWT_SECRETはランダムな長い文字列
- [ ] Stripe Webhook Secretが設定済み
- [ ] CORS設定が正しい（FRONTEND_URLのみ許可）
- [ ] HTTPSが有効（Cloudflare SSL/TLS）
- [ ] 認証エンドポイントがレート制限されている
- [ ] SQLインジェクション対策済み（パラメータ化クエリ）

---

## 本番運用チェックリスト

- [ ] 定期バックアップ設定（Railwayで自動バックアップ有効化）
- [ ] エラーアラート設定（Sentry等）
- [ ] パフォーマンス監視（Vercel Analytics）
- [ ] SEO最適化確認（Google Search Console）
- [ ] プライバシーポリシー・利用規約ページ設置
- [ ] お問い合わせフォーム設置

---

## コスト見積もり（月額）

| サービス | プラン | コスト |
|---------|--------|--------|
| Railway | Starter ($5 + 従量課金) | ~$20 |
| Vercel | Hobby (無料) → Pro ($20) | $0-20 |
| Cloudflare | Free | $0 |
| Stripe | 手数料のみ（3.6%） | 売上に依存 |
| **合計** | | **$20-40** |

※ トラフィック増加時はスケールアップが必要

---

## サポート

問題が発生した場合:
1. ログを確認（Railway/Vercel）
2. 環境変数を再確認
3. `.claude/DEVELOPMENT_LOG.md` に記録
4. 必要に応じてロールバック
