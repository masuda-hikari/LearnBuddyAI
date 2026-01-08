import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { DatabaseService, DbUser, DbUserProgress } from './database';

type UserPlan = 'free' | 'premium' | 'education';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  plan: UserPlan;
  dailyQuestionsUsed: number;
  lastQuestionDate: string;
  createdAt: string;
}

export interface UserProgress {
  totalLessonsCompleted: number;
  totalQuestionsAsked: number;
  wordsLearned: number;
  streak: number;
  lastActiveDate: string;
}

/**
 * ユーザーサービス - ユーザー管理と認証
 * 収益化観点：ユーザー管理はサブスクリプション課金の基盤
 */
export class UserService {
  private db = DatabaseService.getInstance().getDb();

  /**
   * パスワードをハッシュ化
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * DBレコードをUserオブジェクトに変換
   */
  private dbToUser(dbUser: DbUser): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      passwordHash: dbUser.password_hash,
      plan: dbUser.plan as UserPlan,
      dailyQuestionsUsed: dbUser.daily_questions_used,
      lastQuestionDate: dbUser.last_question_date || '',
      createdAt: dbUser.created_at,
    };
  }

  /**
   * DBレコードをUserProgressオブジェクトに変換
   */
  private dbToProgress(dbProgress: DbUserProgress): UserProgress {
    return {
      totalLessonsCompleted: dbProgress.total_lessons_completed,
      totalQuestionsAsked: dbProgress.total_questions_asked,
      wordsLearned: dbProgress.words_learned,
      streak: dbProgress.streak,
      lastActiveDate: dbProgress.last_active_date || '',
    };
  }

  /**
   * 新規ユーザー登録
   */
  async register(username: string, email: string, password: string): Promise<User> {
    // メールアドレスの重複チェック
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = this.hashPassword(password);

    // ユーザー作成
    this.db
      .prepare(
        `
      INSERT INTO users (id, username, email, password_hash, plan, daily_questions_used, created_at)
      VALUES (?, ?, ?, ?, 'free', 0, ?)
    `
      )
      .run(id, username, email, passwordHash, now);

    // 進捗データ初期化
    this.db
      .prepare(
        `
      INSERT INTO user_progress (user_id, total_lessons_completed, total_questions_asked, words_learned, streak)
      VALUES (?, 0, 0, 0, 0)
    `
      )
      .run(id);

    return {
      id,
      username,
      email,
      passwordHash,
      plan: 'free',
      dailyQuestionsUsed: 0,
      lastQuestionDate: '',
      createdAt: now,
    };
  }

  /**
   * ログイン
   */
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const passwordHash = this.hashPassword(password);

    const dbUser = this.db
      .prepare(
        `
      SELECT * FROM users WHERE email = ? AND password_hash = ?
    `
      )
      .get(email, passwordHash) as DbUser | undefined;

    if (!dbUser) {
      return null;
    }

    const user = this.dbToUser(dbUser);
    // 簡易トークン生成（本番ではJWTを使用）
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return { user, token };
  }

  /**
   * ユーザーIDでユーザーを取得
   */
  async getUserById(id: string): Promise<User | null> {
    const dbUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | DbUser
      | undefined;
    return dbUser ? this.dbToUser(dbUser) : null;
  }

  /**
   * 学習進捗を取得
   */
  async getProgress(userId: string): Promise<UserProgress | null> {
    const dbProgress = this.db
      .prepare('SELECT * FROM user_progress WHERE user_id = ?')
      .get(userId) as DbUserProgress | undefined;
    return dbProgress ? this.dbToProgress(dbProgress) : null;
  }

  /**
   * 質問回数をチェック・更新（Free tier制限）
   */
  async checkAndUpdateQuestionLimit(userId: string): Promise<boolean> {
    const dbUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
      | DbUser
      | undefined;
    if (!dbUser) return false;

    // Premiumユーザーは制限なし
    if (dbUser.plan !== 'free') return true;

    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = parseInt(process.env.FREE_DAILY_QUESTIONS || '5', 10);

    let dailyUsed = dbUser.daily_questions_used;
    const lastDate = dbUser.last_question_date;

    // 日付が変わっていたらリセット
    if (lastDate !== today) {
      dailyUsed = 0;
    }

    // 制限チェック
    if (dailyUsed >= dailyLimit) {
      return false;
    }

    // カウント更新
    this.db
      .prepare(
        `
      UPDATE users SET daily_questions_used = ?, last_question_date = ? WHERE id = ?
    `
      )
      .run(dailyUsed + 1, today, userId);

    return true;
  }

  /**
   * プランをアップグレード
   */
  async upgradePlan(userId: string, newPlan: UserPlan): Promise<boolean> {
    const result = this.db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(newPlan, userId);
    return result.changes > 0;
  }

  /**
   * 進捗を更新
   */
  async updateProgress(
    userId: string,
    updates: Partial<UserProgress>
  ): Promise<UserProgress | null> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.totalLessonsCompleted !== undefined) {
      fields.push('total_lessons_completed = ?');
      values.push(updates.totalLessonsCompleted);
    }
    if (updates.totalQuestionsAsked !== undefined) {
      fields.push('total_questions_asked = ?');
      values.push(updates.totalQuestionsAsked);
    }
    if (updates.wordsLearned !== undefined) {
      fields.push('words_learned = ?');
      values.push(updates.wordsLearned);
    }
    if (updates.streak !== undefined) {
      fields.push('streak = ?');
      values.push(updates.streak);
    }
    if (updates.lastActiveDate !== undefined) {
      fields.push('last_active_date = ?');
      values.push(updates.lastActiveDate);
    }

    if (fields.length === 0) {
      return this.getProgress(userId);
    }

    values.push(userId);
    this.db
      .prepare(`UPDATE user_progress SET ${fields.join(', ')} WHERE user_id = ?`)
      .run(...values);

    return this.getProgress(userId);
  }

  /**
   * 連続学習日数（streak）を更新
   */
  async updateStreak(userId: string): Promise<number> {
    const progress = await this.getProgress(userId);
    if (!progress) return 0;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = progress.lastActiveDate?.split('T')[0];

    let newStreak = progress.streak;

    if (!lastActive) {
      // 初回アクティビティ
      newStreak = 1;
    } else if (lastActive === today) {
      // 今日既にアクティブ - streakは変更なし
    } else {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

      if (diffDays === 1) {
        // 連続日
        newStreak = progress.streak + 1;
      } else {
        // 途切れた
        newStreak = 1;
      }
    }

    await this.updateProgress(userId, {
      streak: newStreak,
      lastActiveDate: new Date().toISOString(),
    });

    return newStreak;
  }
}
