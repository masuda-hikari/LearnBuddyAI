import { DatabaseService, DbWordHistory } from './database';

/**
 * 学習分析サービス - パーソナライゼーションの基盤
 *
 * 収益化観点：
 * - Premium機能として詳細な学習分析レポートを提供
 * - 弱点検出による効率的な学習→学習効果向上→継続率向上
 */
export class AnalyticsService {
  private db = DatabaseService.getInstance().getDb();

  /**
   * ユーザーの総合学習分析を取得
   */
  async getComprehensiveAnalysis(userId: string): Promise<ComprehensiveAnalysis> {
    const [wordAnalysis, lessonAnalysis, learningPattern, weaknesses] = await Promise.all([
      this.analyzeWordPerformance(userId),
      this.analyzeLessonProgress(userId),
      this.analyzeLearningPattern(userId),
      this.detectWeaknesses(userId),
    ]);

    // 総合スコアを計算
    const overallScore = this.calculateOverallScore(wordAnalysis, lessonAnalysis);

    return {
      userId,
      analyzedAt: new Date().toISOString(),
      overallScore,
      wordAnalysis,
      lessonAnalysis,
      learningPattern,
      weaknesses,
      recommendations: this.generateRecommendations(wordAnalysis, lessonAnalysis, weaknesses),
    };
  }

  /**
   * 単語学習のパフォーマンス分析
   */
  async analyzeWordPerformance(userId: string): Promise<WordPerformanceAnalysis> {
    const words = this.db
      .prepare('SELECT * FROM word_history WHERE user_id = ?')
      .all(userId) as DbWordHistory[];

    if (words.length === 0) {
      return {
        totalWords: 0,
        masteredCount: 0,
        learningCount: 0,
        strugglingCount: 0,
        masteryRate: 0,
        averageCorrectRate: 0,
        averageEaseFactor: 2.5,
        wordsByDifficulty: { easy: [], medium: [], hard: [] },
      };
    }

    // 単語をカテゴリ分け
    const mastered: string[] = [];
    const learning: string[] = [];
    const struggling: string[] = [];
    const easy: string[] = [];
    const medium: string[] = [];
    const hard: string[] = [];

    let totalCorrect = 0;
    let totalAttempts = 0;
    let totalEaseFactor = 0;

    for (const word of words) {
      const total = word.correct_count + word.incorrect_count;
      totalCorrect += word.correct_count;
      totalAttempts += total;
      totalEaseFactor += word.ease_factor;

      // 習熟度による分類
      if (word.correct_count >= 5 && word.ease_factor >= 2.5) {
        mastered.push(word.word);
      } else if (word.incorrect_count > word.correct_count) {
        struggling.push(word.word);
      } else {
        learning.push(word.word);
      }

      // 難易度による分類
      if (word.ease_factor >= 2.7) {
        easy.push(word.word);
      } else if (word.ease_factor >= 2.0) {
        medium.push(word.word);
      } else {
        hard.push(word.word);
      }
    }

    return {
      totalWords: words.length,
      masteredCount: mastered.length,
      learningCount: learning.length,
      strugglingCount: struggling.length,
      masteryRate: words.length > 0 ? Math.round((mastered.length / words.length) * 100) : 0,
      averageCorrectRate: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      averageEaseFactor: words.length > 0 ? totalEaseFactor / words.length : 2.5,
      wordsByDifficulty: { easy, medium, hard },
    };
  }

  /**
   * レッスン進捗の分析
   */
  async analyzeLessonProgress(userId: string): Promise<LessonProgressAnalysis> {
    const completions = this.db
      .prepare(
        `
        SELECT lesson_id, MAX(score) as best_score, COUNT(*) as attempts,
               AVG(score) as avg_score
        FROM lesson_completions
        WHERE user_id = ?
        GROUP BY lesson_id
      `
      )
      .all(userId) as Array<{
      lesson_id: string;
      best_score: number | null;
      attempts: number;
      avg_score: number | null;
    }>;

    if (completions.length === 0) {
      return {
        completedLessons: 0,
        averageScore: 0,
        bestPerformingLessons: [],
        needsImprovementLessons: [],
        lessonScores: [],
      };
    }

    const lessonScores = completions.map((c) => ({
      lessonId: c.lesson_id,
      bestScore: c.best_score || 0,
      attempts: c.attempts,
      averageScore: c.avg_score || 0,
    }));

    // ベストパフォーマンスと要改善のレッスンを特定
    const sorted = [...lessonScores].sort((a, b) => b.bestScore - a.bestScore);
    const bestPerforming = sorted.slice(0, 3).map((l) => l.lessonId);
    const needsImprovement = sorted
      .filter((l) => l.bestScore < 70)
      .slice(-3)
      .map((l) => l.lessonId);

    const totalScore = lessonScores.reduce((sum, l) => sum + l.bestScore, 0);

    return {
      completedLessons: completions.length,
      averageScore: Math.round(totalScore / completions.length),
      bestPerformingLessons: bestPerforming,
      needsImprovementLessons: needsImprovement,
      lessonScores,
    };
  }

  /**
   * 学習パターンの分析
   */
  async analyzeLearningPattern(userId: string): Promise<LearningPatternAnalysis> {
    // 過去30日の学習活動を分析
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = this.db
      .prepare(
        `
        SELECT started_at, ended_at, words_reviewed, quiz_completed
        FROM learning_sessions
        WHERE user_id = ? AND started_at >= ?
        ORDER BY started_at
      `
      )
      .all(userId, thirtyDaysAgo.toISOString()) as Array<{
      started_at: string;
      ended_at: string | null;
      words_reviewed: number;
      quiz_completed: number;
    }>;

    // 日別・時間帯別の活動を分析
    const dailyActivity: { [date: string]: number } = {};
    const hourlyActivity: { [hour: number]: number } = {};

    for (const session of sessions) {
      const date = session.started_at.split('T')[0];
      const hour = new Date(session.started_at).getHours();

      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    }

    // アクティブな日数
    const activeDays = Object.keys(dailyActivity).length;

    // 最も活発な時間帯を特定
    let peakHour = 0;
    let maxHourActivity = 0;
    for (const [hour, count] of Object.entries(hourlyActivity)) {
      if (count > maxHourActivity) {
        maxHourActivity = count;
        peakHour = parseInt(hour);
      }
    }

    // ストリーク計算
    const progress = this.db
      .prepare('SELECT streak, last_active_date FROM user_progress WHERE user_id = ?')
      .get(userId) as { streak: number; last_active_date: string | null } | undefined;

    // 一貫性スコア（30日中何日活動したか）
    const consistencyScore = Math.round((activeDays / 30) * 100);

    return {
      totalSessionsLast30Days: sessions.length,
      activeDaysLast30Days: activeDays,
      currentStreak: progress?.streak || 0,
      peakLearningHour: peakHour,
      consistencyScore,
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({
        date,
        sessions: count,
      })),
    };
  }

  /**
   * 弱点検出
   */
  async detectWeaknesses(userId: string): Promise<WeaknessReport> {
    const words = this.db
      .prepare('SELECT * FROM word_history WHERE user_id = ?')
      .all(userId) as DbWordHistory[];

    const weakWords: WeakWord[] = [];

    for (const word of words) {
      const total = word.correct_count + word.incorrect_count;
      const correctRate = total > 0 ? word.correct_count / total : 0;

      // 不正解が多い、またはease_factorが低い単語を弱点とする
      if (correctRate < 0.6 || word.ease_factor < 2.0) {
        weakWords.push({
          word: word.word,
          correctRate: Math.round(correctRate * 100),
          incorrectCount: word.incorrect_count,
          easeFactor: word.ease_factor,
          lastReviewed: word.last_reviewed,
          suggestedAction: this.getSuggestedAction(correctRate, word.incorrect_count),
        });
      }
    }

    // 苦手単語が多いか判定
    const weaknessLevel: WeaknessLevel =
      weakWords.length === 0
        ? 'none'
        : weakWords.length <= 3
          ? 'low'
          : weakWords.length <= 7
            ? 'medium'
            : 'high';

    return {
      weaknessLevel,
      weakWordsCount: weakWords.length,
      weakWords: weakWords.sort((a, b) => a.correctRate - b.correctRate).slice(0, 10),
      suggestedFocusAreas: this.suggestFocusAreas(weakWords),
    };
  }

  /**
   * 推奨アクションを生成
   */
  private getSuggestedAction(correctRate: number, incorrectCount: number): string {
    if (correctRate < 0.3) {
      return '基礎から再学習が必要です。定義と例文を確認しましょう。';
    } else if (correctRate < 0.5) {
      return '反復練習を増やしましょう。毎日復習することをお勧めします。';
    } else if (incorrectCount > 5) {
      return '混同しやすい単語かもしれません。類似語との違いを確認しましょう。';
    } else {
      return 'もう少しで習得できます。定期的な復習を続けましょう。';
    }
  }

  /**
   * フォーカスすべきエリアを提案
   */
  private suggestFocusAreas(weakWords: WeakWord[]): string[] {
    const areas: string[] = [];

    if (weakWords.length > 0) {
      // 最も苦手な単語のグループを特定
      const veryWeak = weakWords.filter((w) => w.correctRate < 30);
      if (veryWeak.length > 0) {
        areas.push(
          `基礎復習: ${veryWeak
            .map((w) => w.word)
            .slice(0, 3)
            .join(', ')} など`
        );
      }

      // 反復が必要な単語
      const needsRepetition = weakWords.filter((w) => w.incorrectCount > 3);
      if (needsRepetition.length > 0) {
        areas.push('反復練習を強化');
      }
    }

    if (areas.length === 0) {
      areas.push('現在の学習ペースを維持してください');
    }

    return areas;
  }

  /**
   * 総合スコア計算
   */
  private calculateOverallScore(
    wordAnalysis: WordPerformanceAnalysis,
    lessonAnalysis: LessonProgressAnalysis
  ): number {
    // 習熟率と平均スコアから総合スコアを算出
    const wordScore = wordAnalysis.masteryRate;
    const lessonScore = lessonAnalysis.averageScore;
    const correctRateScore = wordAnalysis.averageCorrectRate;

    // 加重平均（単語の習熟: 40%, 正解率: 30%, レッスンスコア: 30%）
    const overall =
      wordScore * 0.4 + correctRateScore * 0.3 + (lessonScore > 0 ? lessonScore * 0.3 : 0);

    return Math.round(overall);
  }

  /**
   * レコメンデーション生成
   */
  private generateRecommendations(
    wordAnalysis: WordPerformanceAnalysis,
    lessonAnalysis: LessonProgressAnalysis,
    weaknesses: WeaknessReport
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 弱点に基づく推奨
    if (weaknesses.weaknessLevel === 'high') {
      recommendations.push({
        type: 'focus',
        priority: 'high',
        title: '苦手単語の集中復習',
        description: `${weaknesses.weakWordsCount}個の苦手単語があります。集中的に復習しましょう。`,
        action: 'review_weak_words',
      });
    }

    // 習熟率に基づく推奨
    if (wordAnalysis.masteryRate < 30 && wordAnalysis.totalWords > 5) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: '復習頻度を上げましょう',
        description: '習熟率が低めです。毎日の復習で定着を図りましょう。',
        action: 'increase_review_frequency',
      });
    }

    // レッスンスコアに基づく推奨
    if (lessonAnalysis.needsImprovementLessons.length > 0) {
      recommendations.push({
        type: 'lesson',
        priority: 'medium',
        title: 'レッスンの復習',
        description: `${lessonAnalysis.needsImprovementLessons.length}個のレッスンで復習が必要です。`,
        action: 'review_lessons',
      });
    }

    // ポジティブなフィードバック
    if (wordAnalysis.masteryRate >= 70) {
      recommendations.push({
        type: 'praise',
        priority: 'low',
        title: '素晴らしい進捗です！',
        description: '習熟率が高いです。このペースを維持しましょう。',
        action: 'maintain_pace',
      });
    }

    // デフォルト推奨
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        priority: 'low',
        title: '学習を続けましょう',
        description: '毎日少しずつ学習を続けることが大切です。',
        action: 'continue_learning',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 適応型カリキュラムを生成
   */
  async generateAdaptiveCurriculum(userId: string): Promise<AdaptiveCurriculum> {
    const analysis = await this.getComprehensiveAnalysis(userId);

    // 今日のタスクを生成
    const todaysTasks: CurriculumTask[] = [];

    // 弱点復習
    if (analysis.weaknesses.weakWordsCount > 0) {
      todaysTasks.push({
        type: 'review',
        title: '苦手単語の復習',
        description: `${Math.min(5, analysis.weaknesses.weakWordsCount)}個の苦手単語を復習`,
        estimatedMinutes: 10,
        words: analysis.weaknesses.weakWords.slice(0, 5).map((w) => w.word),
      });
    }

    // 新規単語学習
    const newWordsTarget = analysis.wordAnalysis.masteryRate >= 50 ? 5 : 3;
    todaysTasks.push({
      type: 'learn',
      title: '新しい単語を学習',
      description: `${newWordsTarget}個の新しい単語を学習`,
      estimatedMinutes: 15,
      words: [], // 実際の単語はLessonServiceから取得
    });

    // クイズ
    if (analysis.wordAnalysis.totalWords >= 10) {
      todaysTasks.push({
        type: 'quiz',
        title: 'クイズで確認',
        description: '学習した単語をクイズで確認',
        estimatedMinutes: 5,
      });
    }

    return {
      userId,
      generatedAt: new Date().toISOString(),
      currentLevel: this.determineLevel(analysis.overallScore),
      todaysTasks,
      weeklyGoals: this.generateWeeklyGoals(analysis),
      estimatedTotalMinutes: todaysTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    };
  }

  /**
   * ユーザーレベルを判定
   */
  private determineLevel(overallScore: number): string {
    if (overallScore >= 80) return 'advanced';
    if (overallScore >= 50) return 'intermediate';
    if (overallScore >= 20) return 'beginner';
    return 'starter';
  }

  /**
   * 週間目標を生成
   */
  private generateWeeklyGoals(analysis: ComprehensiveAnalysis): WeeklyGoal[] {
    const goals: WeeklyGoal[] = [];

    // 単語学習目標
    const targetWords = analysis.wordAnalysis.masteryRate < 50 ? 20 : 30;
    goals.push({
      type: 'words',
      target: targetWords,
      current: analysis.wordAnalysis.totalWords,
      description: `${targetWords}個の単語を学習`,
    });

    // 習熟目標
    goals.push({
      type: 'mastery',
      target: Math.min(analysis.wordAnalysis.masteryRate + 10, 100),
      current: analysis.wordAnalysis.masteryRate,
      description: '習熟率を10%向上',
    });

    // 学習日数目標
    goals.push({
      type: 'consistency',
      target: 5,
      current: analysis.learningPattern.activeDaysLast30Days > 7 ? 5 : 0,
      description: '週5日学習',
    });

    return goals;
  }
}

// 型定義
export interface ComprehensiveAnalysis {
  userId: string;
  analyzedAt: string;
  overallScore: number;
  wordAnalysis: WordPerformanceAnalysis;
  lessonAnalysis: LessonProgressAnalysis;
  learningPattern: LearningPatternAnalysis;
  weaknesses: WeaknessReport;
  recommendations: Recommendation[];
}

export interface WordPerformanceAnalysis {
  totalWords: number;
  masteredCount: number;
  learningCount: number;
  strugglingCount: number;
  masteryRate: number;
  averageCorrectRate: number;
  averageEaseFactor: number;
  wordsByDifficulty: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
}

export interface LessonProgressAnalysis {
  completedLessons: number;
  averageScore: number;
  bestPerformingLessons: string[];
  needsImprovementLessons: string[];
  lessonScores: Array<{
    lessonId: string;
    bestScore: number;
    attempts: number;
    averageScore: number;
  }>;
}

export interface LearningPatternAnalysis {
  totalSessionsLast30Days: number;
  activeDaysLast30Days: number;
  currentStreak: number;
  peakLearningHour: number;
  consistencyScore: number;
  dailyActivity: Array<{ date: string; sessions: number }>;
}

export type WeaknessLevel = 'none' | 'low' | 'medium' | 'high';

export interface WeaknessReport {
  weaknessLevel: WeaknessLevel;
  weakWordsCount: number;
  weakWords: WeakWord[];
  suggestedFocusAreas: string[];
}

export interface WeakWord {
  word: string;
  correctRate: number;
  incorrectCount: number;
  easeFactor: number;
  lastReviewed: string | null;
  suggestedAction: string;
}

export interface Recommendation {
  type: 'focus' | 'improvement' | 'lesson' | 'praise' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

export interface AdaptiveCurriculum {
  userId: string;
  generatedAt: string;
  currentLevel: string;
  todaysTasks: CurriculumTask[];
  weeklyGoals: WeeklyGoal[];
  estimatedTotalMinutes: number;
}

export interface CurriculumTask {
  type: 'review' | 'learn' | 'quiz';
  title: string;
  description: string;
  estimatedMinutes: number;
  words?: string[];
}

export interface WeeklyGoal {
  type: 'words' | 'mastery' | 'consistency';
  target: number;
  current: number;
  description: string;
}
