import fs from 'fs';
import path from 'path';
import { DatabaseService, DbLessonCompletion } from './database';

interface VocabularyWord {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  definitionJa: string;
  example: string;
  exampleJa: string;
}

interface VocabularyLesson {
  title: string;
  level: string;
  words: VocabularyWord[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'vocabulary' | 'grammar' | 'reading';
  level: string;
  estimatedTime: number;
}

export interface LessonCompletion {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt: string;
}

/**
 * レッスンサービス - 学習コンテンツの管理
 * 収益化観点：レッスン完了追跡は有料機能（進捗分析・カリキュラム生成）の基盤
 */
export class LessonService {
  private contentDir: string;
  private db = DatabaseService.getInstance().getDb();

  constructor() {
    this.contentDir = path.join(__dirname, '../../../content');
  }

  /**
   * 利用可能なレッスン一覧を取得
   */
  async getAllLessons(): Promise<Lesson[]> {
    const lessons: Lesson[] = [
      {
        id: 'vocab-basic-english',
        title: '基礎英単語',
        description: 'ビジネスや日常会話で使える基本的な英単語を学習します',
        type: 'vocabulary',
        level: 'beginner',
        estimatedTime: 15,
      },
      {
        id: 'word-of-the-day',
        title: '今日の単語',
        description: '毎日1つの新しい単語を学習し、例文と一緒に覚えます',
        type: 'vocabulary',
        level: 'all',
        estimatedTime: 5,
      },
    ];

    return lessons;
  }

  /**
   * レッスン詳細を取得
   */
  async getLessonById(id: string): Promise<Lesson | null> {
    const lessons = await this.getAllLessons();
    return lessons.find((l) => l.id === id) || null;
  }

  /**
   * 語彙レッスンの単語リストを取得
   */
  async getVocabularyWords(_lessonId: string): Promise<VocabularyWord[]> {
    try {
      const filePath = path.join(this.contentDir, 'vocabulary', 'basic_english.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      // BOM除去
      const cleanContent = content.replace(/^\uFEFF/, '');
      const data: VocabularyLesson = JSON.parse(cleanContent);
      return data.words;
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      return [];
    }
  }

  /**
   * 今日の単語を取得
   */
  async getWordOfTheDay(): Promise<VocabularyWord | null> {
    const words = await this.getVocabularyWords('vocab-basic-english');
    if (words.length === 0) return null;

    // 日付ベースで単語を選択（毎日異なる単語）
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const index = dayOfYear % words.length;

    return words[index];
  }

  /**
   * レッスン完了を記録
   */
  async markComplete(userId: string, lessonId: string, score?: number): Promise<void> {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO lesson_completions (user_id, lesson_id, score, completed_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(userId, lessonId, score ?? null, now);

    // ユーザー進捗の更新
    this.db
      .prepare(
        `
      UPDATE user_progress
      SET total_lessons_completed = total_lessons_completed + 1,
          last_active_date = ?
      WHERE user_id = ?
    `
      )
      .run(now, userId);
  }

  /**
   * ユーザーの完了済みレッスンを取得
   */
  async getCompletedLessons(userId: string): Promise<LessonCompletion[]> {
    const rows = this.db
      .prepare(
        `
      SELECT user_id, lesson_id, score, completed_at
      FROM lesson_completions
      WHERE user_id = ?
      ORDER BY completed_at DESC
    `
      )
      .all(userId) as DbLessonCompletion[];

    return rows.map((row) => ({
      lessonId: row.lesson_id,
      userId: row.user_id,
      score: row.score ?? undefined,
      completedAt: row.completed_at,
    }));
  }

  /**
   * 特定レッスンの完了回数を取得
   */
  async getLessonCompletionCount(userId: string, lessonId: string): Promise<number> {
    const result = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM lesson_completions
      WHERE user_id = ? AND lesson_id = ?
    `
      )
      .get(userId, lessonId) as { count: number };

    return result.count;
  }

  /**
   * ユーザーの最高スコアを取得
   */
  async getBestScore(userId: string, lessonId: string): Promise<number | null> {
    const result = this.db
      .prepare(
        `
      SELECT MAX(score) as best_score FROM lesson_completions
      WHERE user_id = ? AND lesson_id = ? AND score IS NOT NULL
    `
      )
      .get(userId, lessonId) as { best_score: number | null };

    return result.best_score;
  }
}
