import { AnalyticsService } from '../backend/src/services/analytics';
import { UserService } from '../backend/src/services/user';
import { SpacedRepetitionService } from '../backend/src/services/spaced-repetition';
import { LessonService } from '../backend/src/services/lesson';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let userService: UserService;
  let srService: SpacedRepetitionService;
  let lessonService: LessonService;
  let testUserId: string;

  beforeEach(async () => {
    analyticsService = new AnalyticsService();
    userService = new UserService();
    srService = new SpacedRepetitionService();
    lessonService = new LessonService();

    // テスト用ユーザー作成
    const user = await userService.register(
      'analyticstest',
      `analyticstest${Date.now()}@example.com`,
      'password'
    );
    testUserId = user.id;
  });

  describe('analyzeWordPerformance', () => {
    it('単語データがない場合のデフォルト値を返す', async () => {
      const analysis = await analyticsService.analyzeWordPerformance(testUserId);

      expect(analysis.totalWords).toBe(0);
      expect(analysis.masteredCount).toBe(0);
      expect(analysis.masteryRate).toBe(0);
      expect(analysis.averageEaseFactor).toBe(2.5);
    });

    it('学習した単語の分析を返す', async () => {
      // テストデータ作成
      await srService.recordReview(testUserId, 'word1', 5);
      await srService.recordReview(testUserId, 'word2', 4);
      await srService.recordReview(testUserId, 'word3', 2);

      const analysis = await analyticsService.analyzeWordPerformance(testUserId);

      expect(analysis.totalWords).toBe(3);
      expect(analysis.wordsByDifficulty).toBeDefined();
      expect(Array.isArray(analysis.wordsByDifficulty.easy)).toBe(true);
    });

    it('習熟度でカテゴリ分けされる', async () => {
      // 多数の正解で習熟
      for (let i = 0; i < 5; i++) {
        await srService.recordReview(testUserId, 'mastered_word', 5);
      }
      // 苦手な単語
      await srService.recordReview(testUserId, 'struggling_word', 1);
      await srService.recordReview(testUserId, 'struggling_word', 1);

      const analysis = await analyticsService.analyzeWordPerformance(testUserId);

      expect(analysis.strugglingCount).toBeGreaterThan(0);
    });
  });

  describe('analyzeLessonProgress', () => {
    it('レッスン完了データがない場合', async () => {
      const analysis = await analyticsService.analyzeLessonProgress(testUserId);

      expect(analysis.completedLessons).toBe(0);
      expect(analysis.averageScore).toBe(0);
      expect(analysis.lessonScores).toEqual([]);
    });

    it('レッスン完了を分析できる', async () => {
      // レッスン完了を記録
      await lessonService.markComplete(testUserId, 'lesson1', 80);
      await lessonService.markComplete(testUserId, 'lesson2', 90);

      const analysis = await analyticsService.analyzeLessonProgress(testUserId);

      expect(analysis.completedLessons).toBe(2);
      expect(analysis.averageScore).toBeGreaterThan(0);
      expect(analysis.lessonScores.length).toBe(2);
    });
  });

  describe('analyzeLearningPattern', () => {
    it('学習パターン分析を返す', async () => {
      const analysis = await analyticsService.analyzeLearningPattern(testUserId);

      expect(analysis.totalSessionsLast30Days).toBeDefined();
      expect(analysis.activeDaysLast30Days).toBeDefined();
      expect(analysis.currentStreak).toBeDefined();
      expect(analysis.consistencyScore).toBeDefined();
      expect(Array.isArray(analysis.dailyActivity)).toBe(true);
    });
  });

  describe('detectWeaknesses', () => {
    it('弱点がない場合', async () => {
      const weaknesses = await analyticsService.detectWeaknesses(testUserId);

      expect(weaknesses.weaknessLevel).toBe('none');
      expect(weaknesses.weakWordsCount).toBe(0);
    });

    it('弱点を検出できる', async () => {
      // 不正解の多い単語
      await srService.recordReview(testUserId, 'weak_word', 1);
      await srService.recordReview(testUserId, 'weak_word', 1);
      await srService.recordReview(testUserId, 'weak_word', 1);

      const weaknesses = await analyticsService.detectWeaknesses(testUserId);

      expect(weaknesses.weakWordsCount).toBeGreaterThan(0);
      expect(weaknesses.weakWords.length).toBeGreaterThan(0);
      expect(weaknesses.weakWords[0].word).toBe('weak_word');
    });

    it('弱点レベルを適切に設定する', async () => {
      // 多数の弱点を作成
      for (let i = 0; i < 10; i++) {
        await srService.recordReview(testUserId, `weak_word_${i}`, 0);
      }

      const weaknesses = await analyticsService.detectWeaknesses(testUserId);

      expect(weaknesses.weaknessLevel).toBe('high');
    });
  });

  describe('getComprehensiveAnalysis', () => {
    it('総合分析を返す', async () => {
      const analysis = await analyticsService.getComprehensiveAnalysis(testUserId);

      expect(analysis.userId).toBe(testUserId);
      expect(analysis.analyzedAt).toBeDefined();
      expect(analysis.overallScore).toBeDefined();
      expect(analysis.wordAnalysis).toBeDefined();
      expect(analysis.lessonAnalysis).toBeDefined();
      expect(analysis.learningPattern).toBeDefined();
      expect(analysis.weaknesses).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('レコメンデーションを生成する', async () => {
      // 学習データを作成
      await srService.recordReview(testUserId, 'word1', 5);
      await srService.recordReview(testUserId, 'weak_word', 1);

      const analysis = await analyticsService.getComprehensiveAnalysis(testUserId);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0].title).toBeDefined();
      expect(analysis.recommendations[0].priority).toBeDefined();
    });
  });

  describe('generateAdaptiveCurriculum', () => {
    it('適応型カリキュラムを生成できる', async () => {
      const curriculum = await analyticsService.generateAdaptiveCurriculum(testUserId);

      expect(curriculum.userId).toBe(testUserId);
      expect(curriculum.generatedAt).toBeDefined();
      expect(curriculum.currentLevel).toBeDefined();
      expect(Array.isArray(curriculum.todaysTasks)).toBe(true);
      expect(Array.isArray(curriculum.weeklyGoals)).toBe(true);
      expect(curriculum.estimatedTotalMinutes).toBeGreaterThanOrEqual(0);
    });

    it('弱点がある場合は復習タスクを含む', async () => {
      // 弱点を作成
      await srService.recordReview(testUserId, 'weak_word', 0);

      const curriculum = await analyticsService.generateAdaptiveCurriculum(testUserId);

      const reviewTask = curriculum.todaysTasks.find((t) => t.type === 'review');
      expect(reviewTask).toBeDefined();
    });

    it('週間目標を含む', async () => {
      const curriculum = await analyticsService.generateAdaptiveCurriculum(testUserId);

      expect(curriculum.weeklyGoals.length).toBeGreaterThan(0);
      expect(curriculum.weeklyGoals[0].target).toBeGreaterThan(0);
    });
  });
});
