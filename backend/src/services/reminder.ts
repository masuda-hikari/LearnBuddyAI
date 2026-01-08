import { DatabaseService, DbReminderSettings, DbLearningSession } from './database';
import { SpacedRepetitionService } from './spaced-repetition';

/**
 * リマインダーサービス - 学習継続支援
 *
 * 収益化観点：
 * - Premium機能としてカスタムリマインダー時間設定を提供
 * - 学習継続率向上→サブスク継続率向上
 */
export class ReminderService {
  private db = DatabaseService.getInstance().getDb();

  /**
   * リマインダー設定を取得
   */
  async getSettings(userId: string): Promise<ReminderSettings | null> {
    const settings = this.db
      .prepare('SELECT * FROM reminder_settings WHERE user_id = ?')
      .get(userId) as DbReminderSettings | undefined;

    if (!settings) return null;

    return {
      userId: settings.user_id,
      enabled: settings.enabled === 1,
      preferredTime: settings.preferred_time,
      timezone: settings.timezone,
      frequency: settings.frequency as ReminderFrequency,
      lastReminderSent: settings.last_reminder_sent,
    };
  }

  /**
   * リマインダー設定を作成または更新
   */
  async updateSettings(
    userId: string,
    updates: Partial<ReminderSettingsUpdate>
  ): Promise<ReminderSettings> {
    const existing = await this.getSettings(userId);

    if (existing) {
      // 更新
      const enabled =
        updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled ? 1 : 0;
      const preferredTime = updates.preferredTime || existing.preferredTime;
      const timezone = updates.timezone || existing.timezone;
      const frequency = updates.frequency || existing.frequency;

      this.db
        .prepare(
          `
          UPDATE reminder_settings
          SET enabled = ?, preferred_time = ?, timezone = ?, frequency = ?
          WHERE user_id = ?
        `
        )
        .run(enabled, preferredTime, timezone, frequency, userId);

      return {
        userId,
        enabled: enabled === 1,
        preferredTime,
        timezone,
        frequency,
        lastReminderSent: existing.lastReminderSent,
      };
    } else {
      // 新規作成
      const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : 1;
      const preferredTime = updates.preferredTime || '09:00';
      const timezone = updates.timezone || 'Asia/Tokyo';
      const frequency = updates.frequency || 'daily';

      this.db
        .prepare(
          `
          INSERT INTO reminder_settings (user_id, enabled, preferred_time, timezone, frequency)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .run(userId, enabled, preferredTime, timezone, frequency);

      return {
        userId,
        enabled: enabled === 1,
        preferredTime,
        timezone,
        frequency,
        lastReminderSent: null,
      };
    }
  }

  /**
   * ユーザー登録時にデフォルトのリマインダー設定を作成
   */
  async initializeForUser(userId: string): Promise<void> {
    const existing = await this.getSettings(userId);
    if (!existing) {
      await this.updateSettings(userId, {});
    }
  }

  /**
   * リマインダー送信を記録
   */
  async recordReminderSent(userId: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE reminder_settings SET last_reminder_sent = ? WHERE user_id = ?')
      .run(now, userId);
  }

  /**
   * 学習セッションを開始
   */
  async startSession(userId: string, fromReminder: boolean = false): Promise<LearningSession> {
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `
        INSERT INTO learning_sessions (user_id, started_at, from_reminder)
        VALUES (?, ?, ?)
      `
      )
      .run(userId, now, fromReminder ? 1 : 0);

    return {
      id: result.lastInsertRowid as number,
      userId,
      startedAt: now,
      endedAt: null,
      wordsReviewed: 0,
      quizCompleted: 0,
      fromReminder,
    };
  }

  /**
   * 学習セッションを更新
   */
  async updateSession(
    sessionId: number,
    updates: { wordsReviewed?: number; quizCompleted?: number }
  ): Promise<void> {
    if (updates.wordsReviewed !== undefined) {
      this.db
        .prepare('UPDATE learning_sessions SET words_reviewed = ? WHERE id = ?')
        .run(updates.wordsReviewed, sessionId);
    }
    if (updates.quizCompleted !== undefined) {
      this.db
        .prepare('UPDATE learning_sessions SET quiz_completed = ? WHERE id = ?')
        .run(updates.quizCompleted, sessionId);
    }
  }

  /**
   * 学習セッションを終了
   */
  async endSession(sessionId: number): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE learning_sessions SET ended_at = ? WHERE id = ?').run(now, sessionId);
  }

  /**
   * ユーザーの最近のセッションを取得
   */
  async getRecentSessions(userId: string, limit: number = 10): Promise<LearningSession[]> {
    const sessions = this.db
      .prepare(
        `
        SELECT * FROM learning_sessions
        WHERE user_id = ?
        ORDER BY started_at DESC
        LIMIT ?
      `
      )
      .all(userId, limit) as DbLearningSession[];

    return sessions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      wordsReviewed: s.words_reviewed,
      quizCompleted: s.quiz_completed,
      fromReminder: s.from_reminder === 1,
    }));
  }

  /**
   * 今日のリマインダー対象ユーザーを取得
   *
   * 条件：
   * - リマインダーが有効
   * - 今日まだリマインダーを送信していない
   * - 復習すべき単語がある
   */
  async getUsersForReminder(): Promise<ReminderTarget[]> {
    const today = new Date().toISOString().split('T')[0];

    const users = this.db
      .prepare(
        `
        SELECT rs.user_id, rs.preferred_time, rs.timezone, u.email, u.username
        FROM reminder_settings rs
        JOIN users u ON rs.user_id = u.id
        WHERE rs.enabled = 1
          AND (rs.last_reminder_sent IS NULL OR date(rs.last_reminder_sent) < date(?))
      `
      )
      .all(today) as Array<{
      user_id: string;
      preferred_time: string;
      timezone: string;
      email: string;
      username: string;
    }>;

    const srService = new SpacedRepetitionService();
    const targets: ReminderTarget[] = [];

    for (const user of users) {
      const wordsToReview = await srService.getWordsToReview(user.user_id, 1);
      const stats = await srService.getStats(user.user_id);

      if (wordsToReview.length > 0 || stats.dueToday > 0) {
        targets.push({
          userId: user.user_id,
          email: user.email,
          username: user.username,
          preferredTime: user.preferred_time,
          timezone: user.timezone,
          dueWords: stats.dueToday,
        });
      }
    }

    return targets;
  }

  /**
   * 学習状況サマリーを取得（リマインダーメッセージ用）
   */
  async getLearningStatus(userId: string): Promise<LearningStatus> {
    const srService = new SpacedRepetitionService();
    const stats = await srService.getStats(userId);
    const wordsToReview = await srService.getWordsToReview(userId, 5);

    // 過去7日間の学習セッション数
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentSessionCount = this.db
      .prepare(
        `
        SELECT COUNT(*) as count FROM learning_sessions
        WHERE user_id = ? AND started_at >= ?
      `
      )
      .get(userId, weekAgo.toISOString()) as { count: number };

    // ストリーク情報
    const progress = this.db
      .prepare('SELECT streak, last_active_date FROM user_progress WHERE user_id = ?')
      .get(userId) as { streak: number; last_active_date: string | null } | undefined;

    return {
      dueWordsCount: stats.dueToday,
      totalWordsLearned: stats.totalWords,
      masteredWordsCount: stats.masteredWords,
      masteryPercentage: stats.masteryPercentage,
      weeklySessionCount: recentSessionCount.count,
      currentStreak: progress?.streak || 0,
      wordsPreview: wordsToReview.slice(0, 3).map((w) => w.word),
    };
  }
}

// 型定義
export type ReminderFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface ReminderSettings {
  userId: string;
  enabled: boolean;
  preferredTime: string;
  timezone: string;
  frequency: ReminderFrequency;
  lastReminderSent: string | null;
}

export interface ReminderSettingsUpdate {
  enabled?: boolean;
  preferredTime?: string;
  timezone?: string;
  frequency?: ReminderFrequency;
}

export interface LearningSession {
  id: number;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  wordsReviewed: number;
  quizCompleted: number;
  fromReminder: boolean;
}

export interface ReminderTarget {
  userId: string;
  email: string;
  username: string;
  preferredTime: string;
  timezone: string;
  dueWords: number;
}

export interface LearningStatus {
  dueWordsCount: number;
  totalWordsLearned: number;
  masteredWordsCount: number;
  masteryPercentage: number;
  weeklySessionCount: number;
  currentStreak: number;
  wordsPreview: string[];
}
