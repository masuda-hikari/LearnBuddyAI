import { Router, Request, Response } from 'express';
import { UserService } from '../services/user';

const router = Router();

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/users/register
 * 新規ユーザー登録
 */
router.post('/register', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: '全ての項目を入力してください' });
      return;
    }

    const userService = new UserService();
    const user = await userService.register(username, email, password);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

/**
 * POST /api/users/login
 * ログイン
 */
router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
      return;
    }

    const userService = new UserService();
    const result = await userService.login(email, password);

    if (!result) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが間違っています' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        plan: result.user.plan,
      },
      token: result.token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

/**
 * GET /api/users/progress
 * ユーザーの学習進捗を取得
 */
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const userService = new UserService();
    const progress = await userService.getProgress(userId);

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: '進捗の取得に失敗しました' });
  }
});

export { router as userRouter };
