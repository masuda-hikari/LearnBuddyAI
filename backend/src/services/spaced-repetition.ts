import { DatabaseService, DbWordHistory } from './database';

/**
 * スペースドリピティション（間隔反復）サービス
 * SM-2アルゴリズムを簡略化して実装
 *
 * 収益化観点：効果的な学習法はPremiumユーザーの継続率向上に直結
 */
export class SpacedRepetitionService {
  private db = DatabaseService.getInstance().getDb();

  /**
   * 単語の学習結果を記録し、次回復習日を計算
   *
   * @param userId ユーザーID
   * @param word 単語
   * @param quality 回答品質 (0-5: 0=完全に忘れた, 5=完璧に覚えている)
   */
  async recordReview(userId: string, word: string, quality: number): Promise<ReviewResult> {
    const clampedQuality = Math.max(0, Math.min(5, quality));
    const now = new Date();
    const today = now.toISOString();

    // 既存の履歴を取得
    const existing = this.db
      .prepare('SELECT * FROM word_history WHERE user_id = ? AND word = ?')
      .get(userId, word) as DbWordHistory | undefined;

    let interval: number;
    let easeFactor: number;
    let correctCount: number;
    let incorrectCount: number;

    if (existing) {
      // 既存の学習記録がある場合
      easeFactor = existing.ease_factor;
      correctCount = existing.correct_count;
      incorrectCount = existing.incorrect_count;

      if (clampedQuality >= 3) {
        // 正解の場合
        correctCount++;

        if (existing.interval === 1) {
          interval = 1;
        } else if (existing.interval === 6) {
          interval = 6;
        } else {
          interval = Math.round(existing.interval * easeFactor);
        }

        // 次のインターバル（初回→1日、2回目→6日、以降は倍増）
        if (existing.correct_count === 0) {
          interval = 1;
        } else if (existing.correct_count === 1) {
          interval = 6;
        } else {
          interval = Math.round(existing.interval * easeFactor);
        }
      } else {
        // 不正解の場合：最初からやり直し
        incorrectCount++;
        interval = 1;
      }

      // Ease Factor の更新（SM-2アルゴリズム簡略版）
      easeFactor = easeFactor + (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02));
      easeFactor = Math.max(1.3, easeFactor); // 最小値1.3

      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

      this.db
        .prepare(
          `
        UPDATE word_history
        SET correct_count = ?, incorrect_count = ?, last_reviewed = ?, next_review = ?,
            ease_factor = ?, interval = ?
        WHERE user_id = ? AND word = ?
      `
        )
        .run(correctCount, incorrectCount, today, nextReview, easeFactor, interval, userId, word);

      return {
        word,
        isCorrect: clampedQuality >= 3,
        nextReviewDate: nextReview,
        intervalDays: interval,
        easeFactor,
        correctCount,
        incorrectCount,
      };
    } else {
      // 新規の単語
      interval = 1;
      easeFactor = 2.5;
      correctCount = clampedQuality >= 3 ? 1 : 0;
      incorrectCount = clampedQuality >= 3 ? 0 : 1;

      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

      this.db
        .prepare(
          `
        INSERT INTO word_history (user_id, word, correct_count, incorrect_count, last_reviewed, next_review, ease_factor, interval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(userId, word, correctCount, incorrectCount, today, nextReview, easeFactor, interval);

      // 学習単語数をカウントアップ
      this.db
        .prepare(
          `
        UPDATE user_progress SET words_learned = words_learned + 1 WHERE user_id = ?
      `
        )
        .run(userId);

      return {
        word,
        isCorrect: clampedQuality >= 3,
        nextReviewDate: nextReview,
        intervalDays: interval,
        easeFactor,
        correctCount,
        incorrectCount,
      };
    }
  }

  /**
   * 今日復習すべき単語を取得
   */
  async getWordsToReview(userId: string, limit: number = 10): Promise<WordToReview[]> {
    const today = new Date().toISOString().split('T')[0];

    const words = this.db
      .prepare(
        `
      SELECT word, correct_count, incorrect_count, last_reviewed, next_review, ease_factor, interval
      FROM word_history
      WHERE user_id = ? AND (next_review IS NULL OR date(next_review) <= date(?))
      ORDER BY next_review ASC
      LIMIT ?
    `
      )
      .all(userId, today, limit) as DbWordHistory[];

    return words.map((w) => ({
      word: w.word,
      correctCount: w.correct_count,
      incorrectCount: w.incorrect_count,
      lastReviewed: w.last_reviewed,
      nextReview: w.next_review,
      easeFactor: w.ease_factor,
      intervalDays: w.interval,
    }));
  }

  /**
   * ユーザーの学習統計を取得
   */
  async getStats(userId: string): Promise<LearningStats> {
    const totalWords = this.db
      .prepare('SELECT COUNT(*) as count FROM word_history WHERE user_id = ?')
      .get(userId) as { count: number };

    const masteredWords = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM word_history
      WHERE user_id = ? AND correct_count >= 5 AND ease_factor >= 2.5
    `
      )
      .get(userId) as { count: number };

    const dueToday = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM word_history
      WHERE user_id = ? AND date(next_review) <= date('now')
    `
      )
      .get(userId) as { count: number };

    const avgEaseFactor = this.db
      .prepare('SELECT AVG(ease_factor) as avg FROM word_history WHERE user_id = ?')
      .get(userId) as { avg: number | null };

    return {
      totalWords: totalWords.count,
      masteredWords: masteredWords.count,
      dueToday: dueToday.count,
      averageEaseFactor: avgEaseFactor.avg || 2.5,
      masteryPercentage:
        totalWords.count > 0 ? Math.round((masteredWords.count / totalWords.count) * 100) : 0,
    };
  }

  /**
   * 特定の単語の学習履歴を取得
   */
  async getWordHistory(userId: string, word: string): Promise<WordToReview | null> {
    const history = this.db
      .prepare('SELECT * FROM word_history WHERE user_id = ? AND word = ?')
      .get(userId, word) as DbWordHistory | undefined;

    if (!history) return null;

    return {
      word: history.word,
      correctCount: history.correct_count,
      incorrectCount: history.incorrect_count,
      lastReviewed: history.last_reviewed,
      nextReview: history.next_review,
      easeFactor: history.ease_factor,
      intervalDays: history.interval,
    };
  }
}

// 型定義
export interface ReviewResult {
  word: string;
  isCorrect: boolean;
  nextReviewDate: string;
  intervalDays: number;
  easeFactor: number;
  correctCount: number;
  incorrectCount: number;
}

export interface WordToReview {
  word: string;
  correctCount: number;
  incorrectCount: number;
  lastReviewed: string | null;
  nextReview: string | null;
  easeFactor: number;
  intervalDays: number;
}

export interface LearningStats {
  totalWords: number;
  masteredWords: number;
  dueToday: number;
  averageEaseFactor: number;
  masteryPercentage: number;
}
