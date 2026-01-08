import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { PlanService } from '../services/plan';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

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

interface RefreshRequest {
  refreshToken: string;
}

/**
 * POST /api/auth/register
 * 新規ユーザー登録（JWT認証対応）
 */
router.post('/register', async (req: Request<object, object, RegisterRequest>, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: '全ての項目を入力してください' });
      return;
    }

    // パスワード要件チェック
    if (password.length < 8) {
      res.status(400).json({ error: 'パスワードは8文字以上で入力してください' });
      return;
    }

    const authService = new AuthService();
    const planService = new PlanService();

    const { userId, tokens } = await authService.registerUser(username, email, password);

    // サブスクリプション作成
    await planService.createSubscription(userId, 'free');

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        username,
        email,
        plan: 'free',
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'ユーザー登録に失敗しました';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/auth/login
 * ログイン（JWT認証対応）
 */
router.post('/login', async (req: Request<object, object, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
      return;
    }

    const authService = new AuthService();
    const result = await authService.authenticateUser(email, password);

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
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

/**
 * POST /api/auth/refresh
 * トークンリフレッシュ
 */
router.post('/refresh', async (req: Request<object, object, RefreshRequest>, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'リフレッシュトークンが必要です' });
      return;
    }

    const authService = new AuthService();
    const tokens = await authService.refreshTokens(refreshToken);

    if (!tokens) {
      res.status(401).json({ error: 'リフレッシュトークンが無効または期限切れです' });
      return;
    }

    res.json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'トークンの更新に失敗しました' });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', async (req: Request<object, object, RefreshRequest>, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'リフレッシュトークンが必要です' });
      return;
    }

    const authService = new AuthService();
    await authService.logout(refreshToken);

    res.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'ログアウトに失敗しました' });
  }
});

/**
 * POST /api/auth/logout-all
 * 全デバイスからログアウト
 */
router.post('/logout-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const authService = new AuthService();
    await authService.logoutAllDevices(req.user.userId);

    res.json({
      success: true,
      message: '全デバイスからログアウトしました',
    });
  } catch (error) {
    console.error('Logout-all error:', error);
    res.status(500).json({ error: 'ログアウトに失敗しました' });
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報取得
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const { UserService } = await import('../services/user');
    const userService = new UserService();
    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    const progress = await userService.getProgress(req.user.userId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      progress,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

export { router as authRouter };
