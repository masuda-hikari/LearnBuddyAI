import { UserService } from '../backend/src/services/user';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('register', () => {
    it('新規ユーザーを登録できる', async () => {
      const user = await userService.register('testuser', 'test@example.com', 'password123');

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.plan).toBe('free');
    });

    it('重複メールアドレスでエラーになる', async () => {
      await userService.register('user1', 'duplicate@example.com', 'password');

      await expect(
        userService.register('user2', 'duplicate@example.com', 'password')
      ).rejects.toThrow('このメールアドレスは既に登録されています');
    });
  });

  describe('login', () => {
    it('正しい認証情報でログインできる', async () => {
      await userService.register('loginuser', 'login@example.com', 'mypassword');
      const result = await userService.login('login@example.com', 'mypassword');

      expect(result).not.toBeNull();
      expect(result?.user.email).toBe('login@example.com');
      expect(result?.token).toBeDefined();
    });

    it('間違ったパスワードでログインできない', async () => {
      await userService.register('loginuser', 'login@example.com', 'mypassword');
      const result = await userService.login('login@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('progress', () => {
    it('ユーザー登録時に進捗が初期化される', async () => {
      const user = await userService.register('progressuser', 'progress@example.com', 'password');
      const progress = await userService.getProgress(user.id);

      expect(progress).toBeDefined();
      expect(progress?.totalLessonsCompleted).toBe(0);
      expect(progress?.wordsLearned).toBe(0);
      expect(progress?.streak).toBe(0);
    });
  });

  describe('question limit', () => {
    it('Free tierユーザーは質問制限がある', async () => {
      // 環境変数を設定
      process.env.FREE_DAILY_QUESTIONS = '2';

      const user = await userService.register('limituser', 'limit@example.com', 'password');

      // 1回目と2回目は許可
      expect(await userService.checkAndUpdateQuestionLimit(user.id)).toBe(true);
      expect(await userService.checkAndUpdateQuestionLimit(user.id)).toBe(true);

      // 3回目は制限
      expect(await userService.checkAndUpdateQuestionLimit(user.id)).toBe(false);
    });
  });
});

describe('基本テスト', () => {
  it('テストフレームワークが動作する', () => {
    expect(2 + 2).toBe(4);
  });
});
