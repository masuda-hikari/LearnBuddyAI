import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth';

/**
 * 認証済みリクエスト型拡張
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * 認証ミドルウェア - JWTトークン検証
 * 収益化観点：認証必須エンドポイントを保護
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: '認証が必要です' });
    return;
  }

  // Bearer トークン形式チェック
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: '無効な認証ヘッダー形式です' });
    return;
  }

  const token = parts[1];
  const authService = new AuthService();
  const payload = authService.verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: 'トークンが無効または期限切れです' });
    return;
  }

  // リクエストにユーザー情報を追加
  req.user = payload;
  next();
};

/**
 * オプショナル認証ミドルウェア
 * 認証されていなくてもリクエストを許可（ただしユーザー情報なし）
 */
export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];
  const authService = new AuthService();
  const payload = authService.verifyAccessToken(token);

  if (payload) {
    req.user = payload;
  }

  next();
};

/**
 * プラン別アクセス制御ミドルウェア
 * 収益化観点：Premium機能へのアクセス制限
 */
export const requirePlan =
  (allowedPlans: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({
        error: 'この機能は上位プランでのみ利用可能です',
        requiredPlans: allowedPlans,
        currentPlan: req.user.plan,
        upgradeUrl: '/api/plans/upgrade',
      });
      return;
    }

    next();
  };

/**
 * Premium限定ミドルウェア
 */
export const requirePremium = requirePlan(['premium', 'education']);

/**
 * Education限定ミドルウェア
 */
export const requireEducation = requirePlan(['education']);

/**
 * レート制限ミドルウェア（Free tier用）
 * 収益化観点：Free tierの制限でPremiumへの誘導
 */
export const rateLimitFree = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next();
    return;
  }

  // Premiumユーザーは制限なし
  if (req.user.plan !== 'free') {
    next();
    return;
  }

  // Free tierの日次制限チェック
  const { UserService } = await import('../services/user');
  const userService = new UserService();
  const canProceed = await userService.checkAndUpdateQuestionLimit(req.user.userId);

  if (!canProceed) {
    res.status(429).json({
      error: '本日の質問制限に達しました',
      limit: parseInt(process.env.FREE_DAILY_QUESTIONS || '5', 10),
      message: 'Premiumプランにアップグレードすると無制限で利用できます',
      upgradeUrl: '/api/plans/upgrade',
    });
    return;
  }

  next();
};
