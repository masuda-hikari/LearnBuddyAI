import { AuthService } from '../backend/src/services/auth';
import { PlanService, PlanDetails } from '../backend/src/services/plan';
import { DatabaseService } from '../backend/src/services/database';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    // テスト用データベース初期化
    DatabaseService.getInstance();
  });

  beforeEach(() => {
    authService = new AuthService();
  });

  afterEach(() => {
    // テストデータクリーンアップ（外部キー制約を考慮した順序）
    const db = DatabaseService.getInstance().getDb();
    db.exec("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    db.exec("DELETE FROM user_progress WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    db.exec("DELETE FROM users WHERE email LIKE '%@test.com'");
  });

  describe('hashPassword', () => {
    it('パスワードをハッシュ化できる', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードを検証できる', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否する', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword('wrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('アクセストークンを生成できる', () => {
      const token = authService.generateAccessToken('user-123', 'test@test.com', 'free');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyAccessToken', () => {
    it('有効なアクセストークンを検証できる', () => {
      const token = authService.generateAccessToken('user-123', 'test@test.com', 'free');
      const payload = authService.verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('test@test.com');
      expect(payload?.plan).toBe('free');
      expect(payload?.type).toBe('access');
    });

    it('無効なトークンを拒否する', () => {
      const payload = authService.verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('トークンペアを生成できる', async () => {
      // まずユーザーを作成（外部キー制約対応）
      const { userId } = await authService.registerUser(
        'tokenpairuser',
        'tokenpair@test.com',
        'password123'
      );
      const tokens = await authService.generateTokenPair(userId, 'tokenpair@test.com', 'premium');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60); // 15分
    });
  });

  describe('registerUser', () => {
    it('新規ユーザーを登録できる', async () => {
      const result = await authService.registerUser(
        'testuser',
        'auth-test@test.com',
        'password123'
      );

      expect(result.userId).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('重複メールアドレスを拒否する', async () => {
      await authService.registerUser('testuser1', 'duplicate@test.com', 'password123');

      await expect(
        authService.registerUser('testuser2', 'duplicate@test.com', 'password456')
      ).rejects.toThrow('このメールアドレスは既に登録されています');
    });
  });

  describe('authenticateUser', () => {
    it('正しい認証情報でログインできる', async () => {
      await authService.registerUser('loginuser', 'login@test.com', 'password123');

      const result = await authService.authenticateUser('login@test.com', 'password123');

      expect(result).not.toBeNull();
      expect(result?.user.email).toBe('login@test.com');
      expect(result?.tokens.accessToken).toBeDefined();
    });

    it('間違ったパスワードでログインできない', async () => {
      await authService.registerUser('wrongpass', 'wrongpass@test.com', 'password123');

      const result = await authService.authenticateUser('wrongpass@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('存在しないユーザーでログインできない', async () => {
      const result = await authService.authenticateUser('nonexistent@test.com', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('リフレッシュトークンで新しいトークンペアを取得できる', async () => {
      const { tokens } = await authService.registerUser(
        'refreshuser',
        'refresh@test.com',
        'password123'
      );

      const newTokens = await authService.refreshTokens(tokens.refreshToken);

      expect(newTokens).not.toBeNull();
      expect(newTokens?.accessToken).toBeDefined();
      expect(newTokens?.refreshToken).toBeDefined();
      expect(newTokens?.expiresIn).toBe(15 * 60);
    });

    it('無効なリフレッシュトークンを拒否する', async () => {
      const newTokens = await authService.refreshTokens('invalid-token');
      expect(newTokens).toBeNull();
    });
  });

  describe('logout', () => {
    it('ログアウトでリフレッシュトークンを無効化できる', async () => {
      const { tokens } = await authService.registerUser(
        'logoutuser',
        'logout@test.com',
        'password123'
      );

      const result = await authService.logout(tokens.refreshToken);
      expect(result).toBe(true);

      // 無効化後はリフレッシュできない
      const newTokens = await authService.refreshTokens(tokens.refreshToken);
      expect(newTokens).toBeNull();
    });
  });

  describe('logoutAllDevices', () => {
    it('全デバイスからログアウトできる', async () => {
      const { userId, tokens: tokens1 } = await authService.registerUser(
        'alllogout',
        'alllogout@test.com',
        'password123'
      );

      // 2回目のログインで別のリフレッシュトークンを生成
      await authService.authenticateUser('alllogout@test.com', 'password123');

      await authService.logoutAllDevices(userId);

      // 両方のリフレッシュトークンが無効
      const result = await authService.refreshTokens(tokens1.refreshToken);
      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('期限切れトークンをクリーンアップできる', () => {
      const cleaned = authService.cleanupExpiredTokens();
      expect(typeof cleaned).toBe('number');
    });
  });
});

describe('PlanService', () => {
  let planService: PlanService;

  beforeAll(() => {
    DatabaseService.getInstance();
  });

  beforeEach(() => {
    planService = new PlanService();
  });

  afterEach(() => {
    const db = DatabaseService.getInstance().getDb();
    db.exec("DELETE FROM subscriptions WHERE user_id LIKE 'test-%'");
  });

  // ヘルパー：テスト用ユーザーを作成（外部キー制約対応）
  const createTestUser = (userId: string) => {
    const db = DatabaseService.getInstance().getDb();
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!exists) {
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, plan, daily_questions_used, created_at)
        VALUES (?, ?, ?, 'hash', 'free', 0, datetime('now'))
      `).run(userId, `user-${userId}`, `${userId}@test.com`);
    }
  };

  describe('getAllPlans', () => {
    it('全プランを取得できる', () => {
      const plans: PlanDetails[] = planService.getAllPlans();

      expect(plans.length).toBe(3);
      expect(plans.map((p: PlanDetails) => p.id)).toContain('free');
      expect(plans.map((p: PlanDetails) => p.id)).toContain('premium');
      expect(plans.map((p: PlanDetails) => p.id)).toContain('education');
    });
  });

  describe('getPlanDetails', () => {
    it('Freeプランの詳細を取得できる', () => {
      const plan = planService.getPlanDetails('free');

      expect(plan).not.toBeNull();
      expect(plan?.price).toBe(0);
      expect(plan?.limits.dailyQuestions).toBe(5);
    });

    it('Premiumプランの詳細を取得できる', () => {
      const plan = planService.getPlanDetails('premium');

      expect(plan).not.toBeNull();
      expect(plan?.price).toBe(980);
      expect(plan?.limits.dailyQuestions).toBe(-1); // 無制限
      expect(plan?.limits.analyticsAccess).toBe(true);
    });

    it('存在しないプランはnullを返す', () => {
      const plan = planService.getPlanDetails('invalid' as 'free');
      expect(plan).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('サブスクリプションを作成できる', async () => {
      createTestUser('test-user-1');
      const sub = await planService.createSubscription('test-user-1', 'free');

      expect(sub.userId).toBe('test-user-1');
      expect(sub.plan).toBe('free');
      expect(sub.status).toBe('active');
    });
  });

  describe('upgradePlan', () => {
    it('プランをアップグレードできる', async () => {
      createTestUser('test-user-2');
      await planService.createSubscription('test-user-2', 'free');
      const upgraded = await planService.upgradePlan('test-user-2', 'premium');

      expect(upgraded?.plan).toBe('premium');
      expect(upgraded?.status).toBe('active');
    });

    it('サブスクリプションがない場合は作成される', async () => {
      createTestUser('test-user-3');
      const upgraded = await planService.upgradePlan('test-user-3', 'premium');

      expect(upgraded?.plan).toBe('premium');
    });
  });

  describe('scheduleCancellation', () => {
    it('キャンセルを予約できる', async () => {
      createTestUser('test-user-4');
      await planService.createSubscription('test-user-4', 'premium');
      const cancelled = await planService.scheduleCancellation('test-user-4');

      expect(cancelled?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('cancelCancellation', () => {
    it('キャンセル予約を取り消せる', async () => {
      createTestUser('test-user-5');
      await planService.createSubscription('test-user-5', 'premium');
      await planService.scheduleCancellation('test-user-5');
      const restored = await planService.cancelCancellation('test-user-5');

      expect(restored?.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe('getPlanLimits', () => {
    it('Freeプランの制限を取得できる', () => {
      const limits = planService.getPlanLimits('free');

      expect(limits?.dailyQuestions).toBe(5);
      expect(limits?.analyticsAccess).toBe(false);
      expect(limits?.curriculumAccess).toBe(false);
    });

    it('Premiumプランの制限を取得できる', () => {
      const limits = planService.getPlanLimits('premium');

      expect(limits?.dailyQuestions).toBe(-1);
      expect(limits?.analyticsAccess).toBe(true);
      expect(limits?.curriculumAccess).toBe(true);
    });
  });
});
