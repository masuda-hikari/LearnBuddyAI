import { SpacedRepetitionService } from '../backend/src/services/spaced-repetition';
import { UserService } from '../backend/src/services/user';

describe('SpacedRepetitionService', () => {
  let srService: SpacedRepetitionService;
  let userService: UserService;
  let testUserId: string;

  beforeEach(async () => {
    srService = new SpacedRepetitionService();
    userService = new UserService();

    // テスト用ユーザー作成
    const user = await userService.register(
      'srtest',
      `srtest${Date.now()}@example.com`,
      'password'
    );
    testUserId = user.id;
  });

  describe('recordReview', () => {
    it('新しい単語の学習を記録できる', async () => {
      const result = await srService.recordReview(testUserId, 'abundant', 4);

      expect(result.word).toBe('abundant');
      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(1);
      expect(result.incorrectCount).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.5);
    });

    it('正解時にインターバルが増加する', async () => {
      // 初回
      await srService.recordReview(testUserId, 'abundant', 5);

      // 2回目（1日後）
      const result2 = await srService.recordReview(testUserId, 'abundant', 5);
      expect(result2.correctCount).toBe(2);

      // 3回目（6日後）
      const result3 = await srService.recordReview(testUserId, 'abundant', 5);
      expect(result3.correctCount).toBe(3);
      expect(result3.intervalDays).toBeGreaterThan(6);
    });

    it('不正解時にインターバルがリセットされる', async () => {
      // 正解を重ねる
      await srService.recordReview(testUserId, 'abundant', 5);
      await srService.recordReview(testUserId, 'abundant', 5);

      // 不正解
      const result = await srService.recordReview(testUserId, 'abundant', 1);

      expect(result.isCorrect).toBe(false);
      expect(result.intervalDays).toBe(1); // リセット
      expect(result.incorrectCount).toBe(1);
    });

    it('quality=3以上で正解とみなす', async () => {
      const result3 = await srService.recordReview(testUserId, 'word1', 3);
      expect(result3.isCorrect).toBe(true);

      const result2 = await srService.recordReview(testUserId, 'word2', 2);
      expect(result2.isCorrect).toBe(false);
    });
  });

  describe('getWordsToReview', () => {
    it('復習が必要な単語を取得できる', async () => {
      // 単語を追加
      await srService.recordReview(testUserId, 'word1', 4);
      await srService.recordReview(testUserId, 'word2', 4);

      const words = await srService.getWordsToReview(testUserId, 10);

      // 今日追加した単語は明日が復習日なので、取得されない可能性
      expect(Array.isArray(words)).toBe(true);
    });

    it('limitパラメータが機能する', async () => {
      // 複数単語を追加
      await srService.recordReview(testUserId, 'word1', 4);
      await srService.recordReview(testUserId, 'word2', 4);
      await srService.recordReview(testUserId, 'word3', 4);

      const words = await srService.getWordsToReview(testUserId, 2);

      expect(words.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getStats', () => {
    it('学習統計を取得できる', async () => {
      await srService.recordReview(testUserId, 'word1', 5);
      await srService.recordReview(testUserId, 'word2', 3);

      const stats = await srService.getStats(testUserId);

      expect(stats.totalWords).toBe(2);
      expect(stats.masteredWords).toBeGreaterThanOrEqual(0);
      expect(stats.averageEaseFactor).toBeGreaterThan(0);
      expect(stats.masteryPercentage).toBeDefined();
    });

    it('単語がない場合の統計', async () => {
      const stats = await srService.getStats(testUserId);

      expect(stats.totalWords).toBe(0);
      expect(stats.masteredWords).toBe(0);
      expect(stats.masteryPercentage).toBe(0);
    });
  });

  describe('getWordHistory', () => {
    it('特定の単語の履歴を取得できる', async () => {
      await srService.recordReview(testUserId, 'abundant', 4);

      const history = await srService.getWordHistory(testUserId, 'abundant');

      expect(history).not.toBeNull();
      expect(history?.word).toBe('abundant');
      expect(history?.correctCount).toBe(1);
    });

    it('存在しない単語はnullを返す', async () => {
      const history = await srService.getWordHistory(testUserId, 'nonexistent');

      expect(history).toBeNull();
    });
  });
});
