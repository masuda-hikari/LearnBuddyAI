import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { askRouter } from './routes/ask';
import { lessonRouter } from './routes/lesson';
import { userRouter } from './routes/user';

// 環境変数読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
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
app.use('/api/ask', askRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/users', userRouter);

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
