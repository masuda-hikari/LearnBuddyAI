import { LessonService } from '../backend/src/services/lesson';
import { UserService } from '../backend/src/services/user';

describe('LessonService', () => {
  let lessonService: LessonService;
  let userService: UserService;

  beforeEach(() => {
    lessonService = new LessonService();
    userService = new UserService();
  });

  describe('getAllLessons', () => {
    it('レッスン一覧を取得できる', async () => {
      const lessons = await lessonService.getAllLessons();

      expect(lessons).toBeDefined();
      expect(Array.isArray(lessons)).toBe(true);
      expect(lessons.length).toBeGreaterThan(0);
    });

    it('各レッスンに必要なフィールドがある', async () => {
      const lessons = await lessonService.getAllLessons();
      const lesson = lessons[0];

      expect(lesson.id).toBeDefined();
      expect(lesson.title).toBeDefined();
      expect(lesson.description).toBeDefined();
      expect(lesson.type).toBeDefined();
      expect(lesson.level).toBeDefined();
    });
  });

  describe('getLessonById', () => {
    it('IDでレッスンを取得できる', async () => {
      const lesson = await lessonService.getLessonById('vocab-basic-english');

      expect(lesson).not.toBeNull();
      expect(lesson?.id).toBe('vocab-basic-english');
    });

    it('存在しないIDはnullを返す', async () => {
      const lesson = await lessonService.getLessonById('non-existent-id');

      expect(lesson).toBeNull();
    });
  });

  describe('getWordOfTheDay', () => {
    it('今日の単語を取得できる', async () => {
      const word = await lessonService.getWordOfTheDay();

      // コンテンツファイルが存在する場合
      if (word) {
        expect(word.word).toBeDefined();
        expect(word.definition).toBeDefined();
        expect(word.definitionJa).toBeDefined();
        expect(word.example).toBeDefined();
      }
    });
  });

  describe('markComplete', () => {
    it('レッスン完了を記録できる', async () => {
      // まずユーザーを作成
      const user = await userService.register('testuser', 'test@example.com', 'password');

      await lessonService.markComplete(user.id, 'vocab-basic-english', 85);

      const completed = await lessonService.getCompletedLessons(user.id);
      expect(completed.length).toBe(1);
      expect(completed[0].lessonId).toBe('vocab-basic-english');
      expect(completed[0].score).toBe(85);
    });

    it('同じレッスンを複数回完了できる', async () => {
      const user = await userService.register('multiuser', 'multi@example.com', 'password');

      await lessonService.markComplete(user.id, 'vocab-basic-english', 70);
      await lessonService.markComplete(user.id, 'vocab-basic-english', 90);

      const completed = await lessonService.getCompletedLessons(user.id);
      expect(completed.length).toBe(2);
    });

    it('最高スコアを取得できる', async () => {
      const user = await userService.register('scoreuser', 'score@example.com', 'password');

      await lessonService.markComplete(user.id, 'vocab-basic-english', 70);
      await lessonService.markComplete(user.id, 'vocab-basic-english', 90);
      await lessonService.markComplete(user.id, 'vocab-basic-english', 80);

      const bestScore = await lessonService.getBestScore(user.id, 'vocab-basic-english');
      expect(bestScore).toBe(90);
    });
  });
});
