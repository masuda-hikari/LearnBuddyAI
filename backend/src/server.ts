import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { askRouter } from './routes/ask';
import { lessonRouter } from './routes/lesson';
import { userRouter } from './routes/user';
import { quizRouter } from './routes/quiz';
import { reviewRouter } from './routes/review';
import { reminderRouter } from './routes/reminder';
import { analyticsRouter } from './routes/analytics';
import { authRouter } from './routes/auth';
import { planRouter } from './routes/plan';
import stripeRouter from './routes/stripe';

// 環境変数読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());

// Stripe Webhookはraw bodyが必要なため、先に登録
// 他のルートはJSON parseされたbodyを使う
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ヘルスチェック
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'LearnBuddyAI',
    timestamp: new Date().toISOString(),
  });
});

// APIルート
app.use('/api/auth', authRouter);
app.use('/api/plans', planRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/ask', askRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/users', userRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/review', reviewRouter);
app.use('/api/reminders', reminderRouter);
app.use('/api/analytics', analyticsRouter);

// 404ハンドラー
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`LearnBuddyAI server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
