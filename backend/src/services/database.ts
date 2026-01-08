import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * データベースサービス - SQLite永続化層
 * 収益化観点：ユーザーデータの永続化は有料機能（進捗分析）の基盤
 */
export class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService | null = null;

  private constructor() {
    const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../../data/learnbuddy.db');

    // インメモリDBの場合はディレクトリ作成不要
    if (dbPath !== ':memory:') {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);

    // インメモリDB以外はWALモードを使用
    if (dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
    }

    this.initTables();
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * テーブル初期化
   */
  private initTables(): void {
    // ユーザーテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        daily_questions_used INTEGER DEFAULT 0,
        last_question_date TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // 学習進捗テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_progress (
        user_id TEXT PRIMARY KEY,
        total_lessons_completed INTEGER DEFAULT 0,
        total_questions_asked INTEGER DEFAULT 0,
        words_learned INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_active_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // レッスン完了テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lesson_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        score INTEGER,
        completed_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // クイズ結果テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 単語学習履歴テーブル（スペースドリピティション用）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS word_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        word TEXT NOT NULL,
        correct_count INTEGER DEFAULT 0,
        incorrect_count INTEGER DEFAULT 0,
        last_reviewed TEXT,
        next_review TEXT,
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, word)
      )
    `);

    // 学習リマインダー設定テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminder_settings (
        user_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        preferred_time TEXT DEFAULT '09:00',
        timezone TEXT DEFAULT 'Asia/Tokyo',
        frequency TEXT DEFAULT 'daily',
        last_reminder_sent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 学習セッションログテーブル（リマインダー効果測定用）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        words_reviewed INTEGER DEFAULT 0,
        quiz_completed INTEGER DEFAULT 0,
        from_reminder INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // インデックス作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_word_history_user ON word_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_word_history_review ON word_history(next_review);
      CREATE INDEX IF NOT EXISTS idx_learning_sessions_user ON learning_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_learning_sessions_started ON learning_sessions(started_at);
    `);
  }

  /**
   * データベースインスタンス取得
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * データベース接続クローズ
   */
  close(): void {
    this.db.close();
    DatabaseService.instance = null;
  }

  /**
   * テスト用：インスタンスをリセット（新しいインメモリDBで再初期化）
   */
  static resetForTest(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.db.close();
      DatabaseService.instance = null;
    }
  }

  /**
   * テスト用：全テーブルのデータをクリア
   */
  clearAllData(): void {
    this.db.exec('DELETE FROM learning_sessions');
    this.db.exec('DELETE FROM reminder_settings');
    this.db.exec('DELETE FROM word_history');
    this.db.exec('DELETE FROM quiz_results');
    this.db.exec('DELETE FROM lesson_completions');
    this.db.exec('DELETE FROM user_progress');
    this.db.exec('DELETE FROM users');
  }
}

// ユーザー関連の型定義
export interface DbUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  plan: string;
  daily_questions_used: number;
  last_question_date: string | null;
  created_at: string;
}

export interface DbUserProgress {
  user_id: string;
  total_lessons_completed: number;
  total_questions_asked: number;
  words_learned: number;
  streak: number;
  last_active_date: string | null;
}

export interface DbLessonCompletion {
  id: number;
  user_id: string;
  lesson_id: string;
  score: number | null;
  completed_at: string;
}

export interface DbQuizResult {
  id: number;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  completed_at: string;
}

export interface DbWordHistory {
  id: number;
  user_id: string;
  word: string;
  correct_count: number;
  incorrect_count: number;
  last_reviewed: string | null;
  next_review: string | null;
  ease_factor: number;
  interval: number;
}

export interface DbReminderSettings {
  user_id: string;
  enabled: number; // SQLite: 0 or 1
  preferred_time: string;
  timezone: string;
  frequency: string;
  last_reminder_sent: string | null;
}

export interface DbLearningSession {
  id: number;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  words_reviewed: number;
  quiz_completed: number;
  from_reminder: number; // SQLite: 0 or 1
}
