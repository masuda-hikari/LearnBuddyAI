import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

type UserPlan = 'free' | 'premium' | 'education';

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  plan: UserPlan;
  dailyQuestionsUsed: number;
  lastQuestionDate: string;
  createdAt: string;
}

interface UserProgress {
  totalLessonsCompleted: number;
  totalQuestionsAsked: number;
  wordsLearned: number;
  streak: number; // 連続学習日数
  lastActiveDate: string;
}

/**
 * ユーザーサービス - ユーザー管理と認証
 */
export class UserService {
  // メモリ内ストレージ（後でDBに移行）
  private users: Map<string, User> = new Map();
  private progress: Map<string, UserProgress> = new Map();

  /**
   * パスワードをハッシュ化
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * 新規ユーザー登録
   */
  async register(username: string, email: string, password: string): Promise<User> {
    // メールアドレスの重複チェック
    for (const user of this.users.values()) {
      if (user.email === email) {
        throw new Error('このメールアドレスは既に登録されています');
      }
    }

    const user: User = {
      id: uuidv4(),
      username,
      email,
      passwordHash: this.hashPassword(password),
      plan: 'free',
      dailyQuestionsUsed: 0,
      lastQuestionDate: '',
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);

    // 進捗データの初期化
    this.progress.set(user.id, {
      totalLessonsCompleted: 0,
      totalQuestionsAsked: 0,
      wordsLearned: 0,
      streak: 0,
      lastActiveDate: '',
    });

    return user;
  }

  /**
   * ログイン
   */
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const passwordHash = this.hashPassword(password);

    for (const user of this.users.values()) {
      if (user.email === email && user.passwordHash === passwordHash) {
        // 簡易トークン生成（本番ではJWTを使用）
        const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        return { user, token };
      }
    }

    return null;
  }

  /**
   * ユーザーIDでユーザーを取得
   */
  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  /**
   * 学習進捗を取得
   */
  async getProgress(userId: string): Promise<UserProgress | null> {
    return this.progress.get(userId) || null;
  }

  /**
   * 質問回数をチェック・更新（Free tier制限）
   */
  async checkAndUpdateQuestionLimit(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    // Premiumユーザーは制限なし
    if (user.plan !== 'free') return true;

    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = parseInt(process.env.FREE_DAILY_QUESTIONS || '5', 10);

    // 日付が変わっていたらリセット
    if (user.lastQuestionDate !== today) {
      user.dailyQuestionsUsed = 0;
      user.lastQuestionDate = today;
    }

    // 制限チェック
    if (user.dailyQuestionsUsed >= dailyLimit) {
      return false;
    }

    // カウント更新
    user.dailyQuestionsUsed++;
    this.users.set(userId, user);

    return true;
  }

  /**
   * プランをアップグレード
   */
  async upgradePlan(userId: string, newPlan: UserPlan): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.plan = newPlan;
    this.users.set(userId, user);

    return true;
  }

  /**
   * 進捗を更新
   */
  async updateProgress(
    userId: string,
    updates: Partial<UserProgress>
  ): Promise<UserProgress | null> {
    const current = this.progress.get(userId);
    if (!current) return null;

    const updated = { ...current, ...updates };
    this.progress.set(userId, updated);

    return updated;
  }
}
