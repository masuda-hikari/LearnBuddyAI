import fs from 'fs';
import path from 'path';

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
  estimatedTime: number; // 分
}

interface LessonCompletion {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt: string;
}

/**
 * レッスンサービス - 学習コンテンツの管理
 */
export class LessonService {
  private contentDir: string;
  private completions: LessonCompletion[] = [];

  constructor() {
    this.contentDir = path.join(__dirname, '../../../content');
  }

  /**
   * 利用可能なレッスン一覧を取得
   */
  async getAllLessons(): Promise<Lesson[]> {
    // 現在は語彙レッスンのみ
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
      const data: VocabularyLesson = JSON.parse(content);
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
    const completion: LessonCompletion = {
      lessonId,
      userId,
      score,
      completedAt: new Date().toISOString(),
    };

    this.completions.push(completion);
    // TODO: データベースに永続化
  }

  /**
   * ユーザーの完了済みレッスンを取得
   */
  async getCompletedLessons(userId: string): Promise<LessonCompletion[]> {
    return this.completions.filter((c) => c.userId === userId);
  }
}
