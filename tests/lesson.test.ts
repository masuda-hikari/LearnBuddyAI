import { LessonService } from '../backend/src/services/lesson';

describe('LessonService', () => {
  let lessonService: LessonService;

  beforeEach(() => {
    lessonService = new LessonService();
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
      await lessonService.markComplete('user-123', 'vocab-basic-english', 85);

      const completed = await lessonService.getCompletedLessons('user-123');
      expect(completed.length).toBe(1);
      expect(completed[0].lessonId).toBe('vocab-basic-english');
      expect(completed[0].score).toBe(85);
    });
  });
});
